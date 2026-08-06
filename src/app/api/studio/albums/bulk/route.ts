import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { logAuditEvent } from "@/lib/audit";
import { getTrustedAdminDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { purgeMediaR2Keys } from "@/lib/r2";
import { slugify } from "@/lib/utils";

interface BulkActionPayload {
  action: "soft_delete" | "restore" | "permanent_delete";
  ids: string[];
}

export async function POST(request: NextRequest) {
  const database = await getTrustedAdminDatabase(request);
  if (!database) {
    return apiError("FORBIDDEN", "Only admin can perform bulk operations.", 403);
  }
  const { session, client } = database;

  try {
    const body: BulkActionPayload = await request.json();
    const { action, ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return apiError("INVALID_INPUT", "An array of album IDs is required.", 400);
    }

    if (action === "soft_delete") {
      // Fetch current slugs to append __deleted_ timestamp and free up original slugs
      const { data: currentAlbums } = await client
        .from("albums")
        .select("id, slug")
        .in("id", ids);

      const timestamp = Date.now();
      for (const album of currentAlbums ?? []) {
        const freedSlug = album.slug.includes("__deleted_")
          ? album.slug
          : `${album.slug}__deleted_${timestamp}`;
          
        await client
          .from("albums")
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: session.userId,
            delete_reason: "Bulk soft delete from Studio",
            status: "private",
            slug: freedSlug,
          })
          .eq("id", album.id);
      }

      await logAuditEvent({
        request,
        session,
        action: "admin_bulk_soft_delete_albums",
        targetType: "album",
        targetId: ids.join(","),
        metadata: { count: ids.length },
      });

      revalidateTag("albums:public", "max");
      return apiSuccess({ count: ids.length, action });
    }

    if (action === "restore") {
      const { data: currentAlbums } = await client
        .from("albums")
        .select("id, slug, title")
        .in("id", ids);

      for (const album of currentAlbums ?? []) {
        let restoredSlug = album.slug.replace(/__deleted_\d+$/, "");
        // Verify if restoredSlug collides with an active album
        const { data: collision } = await client
          .from("albums")
          .select("id")
          .eq("slug", restoredSlug)
          .is("deleted_at", null)
          .neq("id", album.id)
          .maybeSingle();

        if (collision) {
          restoredSlug = `${restoredSlug}-restored-${Date.now().toString().slice(-4)}`;
        }

        await client
          .from("albums")
          .update({
            deleted_at: null,
            deleted_by: null,
            delete_reason: null,
            status: "private",
            slug: restoredSlug,
          })
          .eq("id", album.id);
      }

      await logAuditEvent({
        request,
        session,
        action: "admin_bulk_restore_albums",
        targetType: "album",
        targetId: ids.join(","),
        metadata: { count: ids.length },
      });

      revalidateTag("albums:public", "max");
      return apiSuccess({ count: ids.length, action });
    }

    if (action === "permanent_delete") {
      // 1. Fetch media R2 keys for all target albums (including all 10 derivative fields)
      const { data: mediaRows } = await client
        .from("media")
        .select(
          "r2_key,thumbnail_r2_key,medium_r2_key,large_r2_key,poster_r2_key,public_r2_key,original_private_r2_key,avif_thumbnail_r2_key,avif_medium_r2_key,avif_large_r2_key",
        )
        .in("album_id", ids);

      const { data: privateAssetRows } = await client
        .from("private_media_assets")
        .select("object_key,legacy_object_key,bucket_role")
        .in("album_id", ids);

      // 2. Delete album rows from Supabase (cascades or deletes media)
      const { error: deleteError } = await client
        .from("albums")
        .delete()
        .in("id", ids);

      if (deleteError) {
        return apiError("SERVER_ERROR", deleteError.message, 500);
      }

      // 3. Purge R2 objects from public and private buckets
      try {
        await purgeMediaR2Keys(mediaRows ?? [], privateAssetRows ?? []);
      } catch {
        // Log warning but return success for DB deletion
      }

      await logAuditEvent({
        request,
        session,
        action: "admin_bulk_permanent_delete_albums",
        targetType: "album",
        targetId: ids.join(","),
        metadata: { count: ids.length, purgedMediaCount: (mediaRows ?? []).length },
      });

      revalidateTag("albums:public", "max");
      return apiSuccess({ count: ids.length, action });
    }

    return apiError("INVALID_INPUT", "Invalid bulk action.", 400);
  } catch (error) {
    return toServerError(error, request, "api.studio.albums.bulk");
  }
}
