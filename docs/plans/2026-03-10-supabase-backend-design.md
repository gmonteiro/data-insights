# Supabase Backend Design — Data Insights

## Problem
Sending all CSV rows in the LLM context hits the 200K token limit with large files. Need server-side storage + LLM-driven SQL queries.

## Architecture

```
Upload CSV → Parse client-side → Insert into Supabase (metadata + jsonb rows)
User asks question → LLM sees file metadata + 5 sample rows
                   → LLM writes SQL via run_sql tool
                   → API executes read-only query → results to LLM
                   → LLM answers + optionally calls render_chart
```

## Schema

```sql
csv_files (
  id uuid PK default gen_random_uuid(),
  user_id uuid nullable,
  name text not null,
  headers text[] not null,
  row_count int not null,
  context text,
  created_at timestamptz default now()
)

csv_rows (
  id bigint generated always as identity PK,
  file_id uuid references csv_files(id) on delete cascade,
  row_index int not null,
  data jsonb not null
)

CREATE INDEX idx_csv_rows_file_id ON csv_rows(file_id);
```

RLS: enabled, anon SELECT on both tables, service role for writes.

## LLM Tools

1. **run_sql** — executes read-only SELECT, returns JSON results (max 200 rows)
2. **render_chart** — unchanged, renders Recharts from tool args

## System Prompt

Per file: name, headers, row_count, context, 5 sample rows. ~1-2K tokens total regardless of file size.

## What Changes

- Storage: localStorage → Supabase
- LLM context: all rows → metadata + samples
- Data access: raw data in prompt → LLM writes SQL
- File list: Zustand → fetched from Supabase
- Upload: client parse → Supabase insert via API route

## What Stays

- Chat UI, message rendering, chart rendering
- render_chart tool, upload modal UX

## Decisions

- No auth now, nullable user_id for future
- Generic jsonb storage (one table for all CSVs)
- LLM generates SQL (most flexible)
- New Supabase project (isolated)
