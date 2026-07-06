import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { albumUpdateSchema } from "@/lib/validation";

interface AlbumRouteProps {
  params: Promise<{ id: string }>;
}

function albumQuery(id: string) {
  const column = /^\d+$/.test(id) ? "id" : "slug";
  return supabase.from("albums").select("*").eq(column, id).single();
}

export async function GET(_request: NextRequest, { params }: AlbumRouteProps) {
  const { id } = await params;
  const { data: album, error } = await albumQuery(id);

  if (error || !album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  const { data: images, error: imagesError } = await supabase
    .from("images")
    .select("*")
    .eq("album_id", album.id)
    .order("created_at", { ascending: true });

  if (imagesError) {
    return NextResponse.json({ error: imagesError.message }, { status: 500 });
  }

  return NextResponse.json({ ...album, images });
}

export async function PUT(request: NextRequest, { params }: AlbumRouteProps) {
  const { id } = await params;
  const body = await request.json();
  const parsed = albumUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid album update", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const column = /^\d+$/.test(id) ? "id" : "slug";
  const { data, error } = await supabase
    .from("albums")
    .update(parsed.data)
    .eq(column, id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: AlbumRouteProps) {
  const { id } = await params;
  const column = /^\d+$/.test(id) ? "id" : "slug";
  const { error } = await supabase.from("albums").delete().eq(column, id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
