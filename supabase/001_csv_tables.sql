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

CREATE POLICY "anon_select_files" ON csv_files FOR SELECT USING (true);
CREATE POLICY "anon_select_rows" ON csv_rows FOR SELECT USING (true);
CREATE POLICY "service_all_files" ON csv_files FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_rows" ON csv_rows FOR ALL USING (true) WITH CHECK (true);

-- Function to execute read-only queries safely
CREATE OR REPLACE FUNCTION run_readonly_query(sql_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (lower(trim(sql_query)) LIKE 'select%') THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  IF lower(sql_query) ~ '(insert|update|delete|drop|alter|create|truncate|grant|revoke)' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || sql_query || ' LIMIT 200) t'
    INTO result;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
