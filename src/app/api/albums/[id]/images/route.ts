import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { processAndStoreImage } from "@/lib/image-pipeline";
import { supabase } from "@/lib/supabase";
import { maxUploadSize, supportedImageTypes } from "@/lib/validation";

export const runtime = "nodejs";

interface ImagesRouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: ImagesRouteProps) {
  const { id } = await params;
  const { data, error } = await supabase
    .from("images")
    .select("*")
    .eq("album_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest, { params }: ImagesRouteProps) {
  const { id: albumId } = await params;
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (!supportedImageTypes.includes(file.type as (typeof supportedImageTypes)[number])) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 415 });
  }

  if (file.size > maxUploadSize) {
    return NextResponse.json({ error: "File is larger than 50MB" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await processAndStoreImage({
    albumId,
    fileId: randomUUID(),
    fileName: file.name,
    contentType: file.type,
    buffer,
  });

  return NextResponse.json(result, { status: 201 });
}
