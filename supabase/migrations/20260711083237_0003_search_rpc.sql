/*
# Search RPC function

## Purpose
Exposes a Postgres function `search_entities(q, result_limit)` that the frontend
search service calls via supabase.rpc(). It runs a full-text query against the
search_index table's GIN-indexed search_tsv column and returns ranked results.

## Changes
1. Creates `search_entities(q text, result_limit int)` returning a table of
   id, entity_type, entity_id, title, body, rank.
2. Uses plainto_tsquery for user-friendly search input (handles spaces, no
   need for boolean operators).
3. ts_rank orders results by relevance.

## Security
- Function is SECURITY DEFINER so the anon role can call it even though it
  queries search_index (which has a read policy for anon + authenticated).
- search_path pinned to 'public'.
- Idempotent: CREATE OR REPLACE.
*/

CREATE OR REPLACE FUNCTION public.search_entities(q text, result_limit int DEFAULT 20)
RETURNS TABLE (
  id uuid,
  entity_type text,
  entity_id text,
  title text,
  body text,
  rank real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.entity_type,
    s.entity_id,
    s.title,
    s.body,
    ts_rank(s.search_tsv, plainto_tsquery('english', q)) AS rank
  FROM search_index s
  WHERE s.search_tsv @@ plainto_tsquery('english', q)
  ORDER BY rank DESC
  LIMIT COALESCE(result_limit, 20);
END;
$$;
