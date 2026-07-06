import { NextRequest, NextResponse } from "next/server";
import { deleteR2Objects } from "@/lib/r2";
import { supabase } from "@/lib/supabase";

interface ImageRouteProps {
  params: Promise<{ id: string; imageId: string }>;
}

export async function DELETE(
  _request: NextRequest,
  { params }: ImageRouteProps,
) {
  const { id: albumId, imageId } = await params;
  const { data: image, error: selectError } = await supabase
    .from("images")
    .select("original_key,medium_key,thumb_key")
    .eq("album_id", albumId)
    .eq("id", imageId)
    .single();

  if (selectError || !image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  await deleteR2Objects([
    image.original_key,
    image.medium_key,
    image.thumb_key,
  ]);

  const { error } = await supabase
    .from("images")
    .delete()
    .eq("album_id", albumId)
    .eq("id", imageId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
