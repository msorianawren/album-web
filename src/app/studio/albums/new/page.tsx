import { AlbumForm } from "@/components/studio/AlbumForm";
import { StudioPageHeader } from "@/components/studio/StudioPageHeader";
import { getSiteSettings } from "@/lib/site-settings";

export default async function StudioNewAlbumPage() {
  const settings = await getSiteSettings();

  return (
    <div className="grid gap-5">
      <StudioPageHeader
        eyebrow="Create"
        title="New album"
        description="Create an album with a clean slug, visibility status, and optional cover URL."
      />
      <AlbumForm defaultStatus={settings.default_album_status} />
    </div>
  );
}
