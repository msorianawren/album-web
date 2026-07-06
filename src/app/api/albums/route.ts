import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { albumSchema } from "@/lib/validation";

export async function GET() {
  const { data, error } = await supabase
    .from("albums")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = albumSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid album payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const ownerId = parsed.data.owner_id ?? process.env.DEFAULT_OWNER_ID;
  if (!ownerId) {
    return NextResponse.json(
      { error: "owner_id is required until authenticated create is enabled." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("albums")
    .insert({
      owner_id: ownerId,
      title: parsed.data.title,
      slug: parsed.data.slug,
      description: parsed.data.description,
      is_public: parsed.data.is_public,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
