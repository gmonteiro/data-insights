# Supabase Backend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace localStorage CSV storage with Supabase, and give the LLM a `run_sql` tool to query data instead of sending all rows in the prompt.

**Architecture:** CSV files are parsed client-side then uploaded to Supabase via an API route. The LLM receives only file metadata + 5 sample rows, and uses a `run_sql` tool to execute read-only SQL queries against the data. Charts still use `render_chart`.

**Tech Stack:** Supabase (postgres + JS client), AI SDK v6, Next.js API routes

---

### Task 1: Create Supabase project and run migration

**Context:** User needs to create a new Supabase project manually, then we apply the schema.

**Step 1: Create migration file**

Create: `supabase/001_csv_tables.sql`

```sql
-- CSV file metadata
CREATE TABLE csv_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  headers text[] NOT NULL,
  row_count int NOT NULL,
  context text,
  created_at timestamptz DEFAULT now()
);

-- CSV row data as jsonb
CREATE TABLE csv_rows (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  file_id uuid NOT NULL REFERENCES csv_files(id) ON DELETE CASCADE,
  row_index int NOT NULL,
  data jsonb NOT NULL
);

CREATE INDEX idx_csv_rows_file_id ON csv_rows(file_id);

-- RLS
ALTER TABLE csv_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_rows ENABLE ROW LEVEL SECURITY;

-- Anon can read all files and rows
CREATE POLICY "anon_select_files" ON csv_files FOR SELECT USING (true);
CREATE POLICY "anon_select_rows" ON csv_rows FOR SELECT USING (true);

-- Service role can do everything (used by API routes)
CREATE POLICY "service_all_files" ON csv_files FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_rows" ON csv_rows FOR ALL USING (true) WITH CHECK (true);
```

**Step 2: User creates Supabase project**

User action: Create project at https://supabase.com/dashboard, run the SQL above in the SQL Editor, then provide the URL and keys.

**Step 3: Install Supabase client**

Run: `npm install @supabase/supabase-js`

**Step 4: Create Supabase client lib**

Create: `src/lib/supabase.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

// Client-side (anon key — read only via RLS)
export function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Server-side (service role — full access, used in API routes only)
export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

**Step 5: Add env vars to `.env.local`**

```
NEXT_PUBLIC_SUPABASE_URL=<from user>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from user>
SUPABASE_SERVICE_ROLE_KEY=<from user>
```

**Step 6: Commit**

```bash
git add supabase/ src/lib/supabase.ts
git commit -m "feat: add Supabase client and CSV tables migration"
```

---

### Task 2: Create upload API route

**Context:** Client parses CSV, sends parsed data to API route, API route inserts into Supabase in batches.

**Files:**
- Create: `src/app/api/files/route.ts`

**Step 1: Create the upload API route**

Create: `src/app/api/files/route.ts`

```typescript
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

  // Insert file metadata
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
      // Cleanup on failure
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
```

**Step 2: Commit**

```bash
git add src/app/api/files/
git commit -m "feat: add files API route (upload, list, delete)"
```

---

### Task 3: Replace Zustand store with Supabase-backed store

**Context:** The store no longer holds row data — just file metadata fetched from Supabase. Upload triggers API call instead of local storage.

**Files:**
- Rewrite: `src/lib/csv-store.ts`
- Modify: `src/types/index.ts`

**Step 1: Update types — CsvFile no longer holds rows**

Modify: `src/types/index.ts`

```typescript
export interface CsvFile {
  id: string;
  name: string;
  headers: string[];
  row_count: number;
  context?: string;
  created_at?: string;
}

// Only used during upload (client-side, before sending to API)
export interface CsvUploadPayload {
  name: string;
  headers: string[];
  rows: Record<string, string>[];
  context?: string;
}

export interface ChartData {
  rows: Record<string, unknown>[];
  xAxisKey: string;
  yAxisKeys: string[];
  chartType: "bar" | "line" | "pie" | "area" | "scatter";
  title?: string;
  seriesColors?: Record<string, string>;
}
```

**Step 2: Rewrite csv-store to use Supabase API**

Rewrite: `src/lib/csv-store.ts`

```typescript
import { create } from "zustand";
import type { CsvFile } from "@/types";

interface CsvStore {
  files: CsvFile[];
  loading: boolean;
  fetchFiles: () => Promise<void>;
  uploadFile: (payload: {
    name: string;
    headers: string[];
    rows: Record<string, string>[];
    context?: string;
  }) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
}

export const useCsvStore = create<CsvStore>((set) => ({
  files: [],
  loading: false,

  fetchFiles: async () => {
    set({ loading: true });
    const res = await fetch("/api/files");
    const data = await res.json();
    set({ files: Array.isArray(data) ? data : [], loading: false });
  },

  uploadFile: async (payload) => {
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Upload failed");
    }
    // Refresh file list
    const listRes = await fetch("/api/files");
    const data = await listRes.json();
    set({ files: Array.isArray(data) ? data : [] });
  },

  deleteFile: async (id) => {
    await fetch("/api/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    set((state) => ({ files: state.files.filter((f) => f.id !== id) }));
  },
}));
```

**Step 3: Commit**

```bash
git add src/types/index.ts src/lib/csv-store.ts
git commit -m "feat: replace localStorage store with Supabase-backed API store"
```

---

### Task 4: Update upload components

**Context:** csv-dropzone now calls store.uploadFile instead of store.addFile. upload-modal handles the async flow.

**Files:**
- Modify: `src/components/upload/csv-dropzone.tsx`
- Modify: `src/components/upload/upload-modal.tsx`
- Keep: `src/lib/csv-parser.ts` (still parses client-side, but rows go to API)

**Step 1: Update csv-dropzone**

Rewrite: `src/components/upload/csv-dropzone.tsx`

```typescript
"use client";

import { useCallback, useState } from "react";
import { parseCsvFile } from "@/lib/csv-parser";
import type { CsvUploadPayload } from "@/types";

interface CsvDropzoneProps {
  onFileLoaded?: (payload: CsvUploadPayload) => void;
}

export function CsvDropzone({ onFileLoaded }: CsvDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      setError(null);
      for (const file of Array.from(fileList)) {
        if (!file.name.endsWith(".csv")) {
          setError("Only CSV files are supported");
          continue;
        }
        try {
          const parsed = await parseCsvFile(file);
          onFileLoaded?.({
            name: parsed.name,
            headers: parsed.headers,
            rows: parsed.rows,
          });
        } catch {
          setError(`Failed to parse ${file.name}`);
        }
      }
    },
    [onFileLoaded]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
        dragging
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 hover:border-gray-400"
      }`}
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".csv";
        input.multiple = true;
        input.onchange = () => {
          if (input.files) handleFiles(input.files);
        };
        input.click();
      }}
    >
      <p className="text-sm text-gray-500">
        Drop CSV files here or click to browse
      </p>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
```

**Step 2: Update upload-modal**

Rewrite: `src/components/upload/upload-modal.tsx`

```typescript
"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CsvDropzone } from "./csv-dropzone";
import { CsvPreview } from "./csv-preview";
import { useCsvStore } from "@/lib/csv-store";
import type { CsvUploadPayload } from "@/types";

export function UploadModal() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<CsvUploadPayload | null>(null);
  const [context, setContext] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadFile = useCsvStore((s) => s.uploadFile);

  const handleFileLoaded = (p: CsvUploadPayload) => {
    setPayload(p);
    setContext("");
    setError(null);
  };

  const handleUpload = async () => {
    if (!payload) return;
    setUploading(true);
    setError(null);
    try {
      await uploadFile({ ...payload, context: context.trim() || undefined });
      setOpen(false);
      setPayload(null);
      setContext("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="outline" size="sm" className="w-full" />}
      >
        + Upload CSV
      </SheetTrigger>
      <SheetContent side="left" className="w-[450px] sm:w-[500px]">
        <SheetHeader>
          <SheetTitle>Upload CSV File</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <CsvDropzone onFileLoaded={handleFileLoaded} />
          {payload && (
            <>
              <CsvPreview
                file={{
                  id: "preview",
                  name: payload.name,
                  headers: payload.headers,
                  rows: payload.rows,
                  row_count: payload.rows.length,
                }}
              />
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Describe this data (optional)
                </label>
                <Textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g. Monthly sales data for 2024..."
                  rows={3}
                />
              </div>
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
              <Button
                onClick={handleUpload}
                className="w-full"
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

**Step 3: Update csv-preview to accept rows for preview**

Modify: `src/components/upload/csv-preview.tsx` — update the `file` prop type to accept a preview object with `rows`:

```typescript
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PreviewFile {
  headers: string[];
  rows: Record<string, string>[];
  row_count: number;
}

export function CsvPreview({ file }: { file: PreviewFile }) {
  const previewRows = file.rows.slice(0, 10);

  return (
    <div className="mt-4 max-h-[300px] overflow-auto rounded border">
      <Table>
        <TableHeader>
          <TableRow>
            {file.headers.map((h) => (
              <TableHead key={h} className="whitespace-nowrap text-xs">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {previewRows.map((row, i) => (
            <TableRow key={i}>
              {file.headers.map((h) => (
                <TableCell key={h} className="whitespace-nowrap text-xs">
                  {row[h]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {file.row_count > 10 && (
        <p className="p-2 text-center text-xs text-gray-400">
          Showing 10 of {file.row_count} rows
        </p>
      )}
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/components/upload/
git commit -m "feat: update upload components to use Supabase API"
```

---

### Task 5: Update sidebar to fetch from Supabase

**Files:**
- Modify: `src/components/sidebar/file-sidebar.tsx`
- Modify: `src/components/sidebar/file-card.tsx`

**Step 1: Update file-sidebar to fetch on mount**

```typescript
"use client";

import { useEffect } from "react";
import { useCsvStore } from "@/lib/csv-store";
import { FileCard } from "./file-card";
import { UploadModal } from "../upload/upload-modal";
import { Separator } from "@/components/ui/separator";

export function FileSidebar() {
  const files = useCsvStore((s) => s.files);
  const loading = useCsvStore((s) => s.loading);
  const fetchFiles = useCsvStore((s) => s.fetchFiles);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return (
    <div className="flex h-full w-64 flex-col border-r bg-gray-50 p-3">
      <h2 className="mb-2 text-sm font-semibold text-gray-700">Files</h2>
      <UploadModal />
      <Separator className="my-3" />
      <div className="flex-1 space-y-2 overflow-auto">
        {loading ? (
          <p className="text-center text-xs text-gray-400">Loading...</p>
        ) : files.length === 0 ? (
          <p className="text-center text-xs text-gray-400">
            No files uploaded
          </p>
        ) : (
          files.map((f) => <FileCard key={f.id} file={f} />)
        )}
      </div>
    </div>
  );
}
```

**Step 2: Update file-card (row_count instead of rowCount)**

```typescript
"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CsvFile } from "@/types";
import { useCsvStore } from "@/lib/csv-store";

export function FileCard({ file }: { file: CsvFile }) {
  const deleteFile = useCsvStore((s) => s.deleteFile);

  return (
    <Card className="p-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <div className="mt-1 flex gap-1">
            <Badge variant="secondary" className="text-xs">
              {file.row_count} rows
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {file.headers.length} cols
            </Badge>
          </div>
          {file.context && (
            <p className="mt-1 truncate text-xs text-gray-500">
              {file.context}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
          onClick={() => deleteFile(file.id)}
        >
          x
        </Button>
      </div>
    </Card>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/sidebar/
git commit -m "feat: update sidebar to fetch files from Supabase"
```

---

### Task 6: Rewrite chat API route with run_sql tool

**Context:** This is the core change. The LLM gets file metadata + samples as context, plus a `run_sql` tool to query data.

**Files:**
- Rewrite: `src/app/api/chat/route.ts`
- Rewrite: `src/lib/format-csv-context.ts`
- Delete: `src/lib/chart-schemas.ts` (no longer needed separately)

**Step 1: Rewrite format-csv-context — metadata + 5 sample rows only**

```typescript
import type { CsvFile } from "@/types";

export function formatCsvContext(
  files: CsvFile[],
  samples: Record<string, Record<string, string>[]>
): string {
  if (files.length === 0) {
    return "No CSV files have been uploaded yet. Ask the user to upload a CSV file to get started.";
  }

  const parts = files.map((file) => {
    const sampleRows = samples[file.id] ?? [];
    const sampleStr = sampleRows.length > 0
      ? `Sample rows (first 5):\n${JSON.stringify(sampleRows, null, 2)}`
      : "No sample rows available.";

    return [
      `## File: ${file.name} (id: ${file.id})`,
      file.context ? `Description: ${file.context}` : null,
      `Headers: ${file.headers.join(", ")}`,
      `Row count: ${file.row_count}`,
      sampleStr,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    "You are a data analyst assistant. The user has uploaded CSV files stored in a PostgreSQL database.",
    "",
    "To analyze data, use the `run_sql` tool to execute SELECT queries.",
    "Data is stored in table `csv_rows` with columns: file_id (uuid), row_index (int), data (jsonb).",
    "Access fields with: data->>'field_name' (returns text) or (data->>'field_name')::numeric (for numbers).",
    "",
    "Example queries:",
    "- Top values: SELECT data->>'Dia' as dia, (data->>'MEDIA')::numeric as media FROM csv_rows WHERE file_id = '<id>' ORDER BY (data->>'MEDIA')::numeric DESC LIMIT 10",
    "- Aggregation: SELECT date_trunc('month', (data->>'Dia')::date) as month, MAX((data->>'MEDIA')::numeric) as max_media FROM csv_rows WHERE file_id = '<id>' GROUP BY month ORDER BY month",
    "",
    "IMPORTANT: Always use the file_id in WHERE clauses. Always cast numeric fields with ::numeric for sorting/aggregation.",
    "When the user asks for a chart, first query the data with run_sql, then use render_chart with the results.",
    "For tabular answers, use markdown tables.",
    "",
    ...parts,
  ].join("\n");
}
```

**Step 2: Rewrite chat API route**

```typescript
import { anthropic } from "@ai-sdk/anthropic";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
  type Tool,
} from "ai";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { formatCsvContext } from "@/lib/format-csv-context";
import type { CsvFile } from "@/types";

export const maxDuration = 60;

const runSqlTool: Tool = {
  description:
    "Execute a read-only SQL SELECT query against the CSV data in PostgreSQL. Returns up to 200 rows as JSON. Use this to analyze uploaded CSV data.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("A SELECT SQL query. Must be read-only. Use csv_rows table with data->>field_name for access."),
  }),
  execute: async ({ query }: { query: string }) => {
    // Safety: only allow SELECT
    const trimmed = query.trim().toLowerCase();
    if (!trimmed.startsWith("select")) {
      return { error: "Only SELECT queries are allowed." };
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("run_readonly_query", {
      sql_query: query,
    });

    if (error) {
      return { error: error.message };
    }
    return { rows: data, rowCount: Array.isArray(data) ? data.length : 0 };
  },
};

const renderChartTool: Tool = {
  description:
    "Render a chart from data. Use this when the user asks for a visualization. First query data with run_sql, then pass the results here.",
  inputSchema: z.object({
    rows: z.array(z.record(z.string(), z.any())),
    xAxisKey: z.string().describe("Key for the X axis"),
    yAxisKeys: z.array(z.string()).describe("Keys for the Y axis series"),
    chartType: z
      .enum(["bar", "line", "pie", "area", "scatter"])
      .describe("Type of chart to render"),
    title: z.string().optional().describe("Chart title"),
    seriesColors: z
      .record(z.string(), z.string())
      .optional()
      .describe("Map of yAxisKey to color hex"),
  }),
  execute: async () => "chart_rendered",
};

export async function POST(req: Request) {
  const { messages, fileIds } = (await req.json()) as {
    messages: UIMessage[];
    fileIds?: string[];
  };

  const supabase = getSupabaseAdmin();

  // Fetch file metadata
  let files: CsvFile[] = [];
  if (fileIds?.length) {
    const { data } = await supabase
      .from("csv_files")
      .select("id, name, headers, row_count, context")
      .in("id", fileIds);
    files = (data as CsvFile[]) ?? [];
  }

  // Fetch 5 sample rows per file
  const samples: Record<string, Record<string, string>[]> = {};
  for (const file of files) {
    const { data } = await supabase
      .from("csv_rows")
      .select("data")
      .eq("file_id", file.id)
      .order("row_index")
      .limit(5);
    samples[file.id] = (data?.map((r: { data: Record<string, string> }) => r.data) ?? []);
  }

  const systemPrompt = formatCsvContext(files, samples);
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: systemPrompt,
    messages: modelMessages,
    tools: {
      run_sql: runSqlTool,
      render_chart: renderChartTool,
    },
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse();
}
```

**Step 3: Create Supabase RPC function for safe SQL execution**

Add to migration or run in SQL Editor:

```sql
-- Function to execute read-only queries safely
CREATE OR REPLACE FUNCTION run_readonly_query(sql_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Only allow SELECT
  IF NOT (lower(trim(sql_query)) LIKE 'select%') THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  -- Block dangerous keywords
  IF lower(sql_query) ~ '(insert|update|delete|drop|alter|create|truncate|grant|revoke)' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || sql_query || ' LIMIT 200) t'
    INTO result;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
```

**Step 4: Commit**

```bash
git add src/app/api/chat/route.ts src/lib/format-csv-context.ts supabase/
git commit -m "feat: add run_sql tool, metadata-only context, RPC function"
```

---

### Task 7: Update chat-interface to send fileIds instead of csvData

**Files:**
- Modify: `src/components/chat/chat-interface.tsx`

**Step 1: Update transport body to send fileIds**

```typescript
"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCsvStore } from "@/lib/csv-store";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";

const transport = new DefaultChatTransport({
  api: "/api/chat",
  body: () => ({
    fileIds: useCsvStore.getState().files.map((f) => f.id),
  }),
});

export function ChatInterface() {
  const { messages, sendMessage, status, error } = useChat({ transport });

  const isLoading = status === "streaming" || status === "submitted";

  const handleSend = (text: string) => {
    sendMessage({ text });
  };

  return (
    <div className="flex h-full flex-col">
      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-gray-400">
          <div className="text-center">
            <h2 className="mb-2 text-xl font-semibold text-gray-600">
              Data Insights
            </h2>
            <p>Upload a CSV file and ask questions about your data</p>
          </div>
        </div>
      ) : (
        <MessageList messages={messages} />
      )}
      {error && (
        <div className="mx-auto max-w-3xl px-4 py-2 text-sm text-red-600">
          Error: {error.message}
        </div>
      )}
      <ChatInput onSend={handleSend} isLoading={isLoading} />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/chat/chat-interface.tsx
git commit -m "feat: send fileIds instead of full CSV data to chat API"
```

---

### Task 8: Cleanup and add env vars to Vercel

**Files:**
- Delete: `src/lib/chart-schemas.ts` (unused)
- Modify: `src/lib/csv-parser.ts` (keep only parseCsvFile, remove summarizeCsv if still there)

**Step 1: Delete unused files**

```bash
rm src/lib/chart-schemas.ts
```

**Step 2: Add Supabase env vars to Vercel**

```bash
echo "<URL>" | npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo "<ANON_KEY>" | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo "<SERVICE_ROLE_KEY>" | npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

**Step 3: Build and verify**

```bash
npm run build
```

**Step 4: Commit, push, and deploy**

```bash
git add -A
git commit -m "chore: cleanup unused files, final build verification"
git push
```

---

### Task 9: End-to-end test

**Step 1:** Open https://data-insights-tau.vercel.app (hard refresh)
**Step 2:** Upload a CSV file → verify it appears in sidebar
**Step 3:** Ask "qual maior valor de tempo medio e plote um grafico com o maior valor de cada mes"
**Step 4:** Verify: LLM calls run_sql → gets results → answers with data → calls render_chart → chart renders
