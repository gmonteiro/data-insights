import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const { name, headers, rows, context } = (await req.json()) as {
    name: string;
    headers: string[];
    rows: Record<string, string>[];
    context?: string;
  };

  const supabase = getSupabaseAdmin();

  const { data: file, error: fileErr } = await supabase
    .from("csv_files")
    .insert({ name, headers, row_count: rows.length, context })
    .select("id")
    .single();

  if (fileErr || !file) {
    return NextResponse.json(
      { error: fileErr?.message ?? "Failed to create file" },
      { status: 500 }
    );
  }

  // Insert rows in batches of 500
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map((row, idx) => ({
      file_id: file.id,
      row_index: i + idx,
      data: row,
    }));

    const { error: rowErr } = await supabase.from("csv_rows").insert(batch);
    if (rowErr) {
      await supabase.from("csv_files").delete().eq("id", file.id);
      return NextResponse.json(
        { error: `Row insert failed: ${rowErr.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ id: file.id });
}

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("csv_files")
    .select("id, name, headers, row_count, context, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const { id } = (await req.json()) as { id: string };
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("csv_files").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
