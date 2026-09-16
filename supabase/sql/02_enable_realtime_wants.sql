-- Enables Realtime broadcasting for the `wants` table.
--
-- The client in src/App.jsx already subscribes to postgres_changes on
-- `wants` (INSERT/UPDATE/DELETE) and merges new rows into the board's
-- local state — that code path is correct. If new shoutouts only show up
-- after a manual refresh, the table almost certainly hasn't been added to
-- Supabase's `supabase_realtime` publication, so Postgres never emits
-- change events to the Realtime server in the first place — the client
-- subscription just sits there with nothing to receive.
--
-- Run this in the Supabase SQL Editor. It's idempotent — safe to run even
-- if the table's already in the publication.
--
-- (Equivalent dashboard path: Database -> Replication -> toggle "wants" on
-- for the supabase_realtime publication.)

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'wants'
  ) then
    alter publication supabase_realtime add table public.wants;
  end if;
end $$;
