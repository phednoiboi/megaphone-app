-- Personal want list — a private, per-user list of cards to look for, prepped
-- ahead of a show so they can be quick-selected onto the board instead of
-- retyped. The client in src/App.jsx already reads/writes/subscribes to
-- `want_list` (loadWatchlist / addToWatchlist / removeFromWatchlist), but
-- that table was never created in Supabase — every add/remove silently
-- failed against a relation that doesn't exist, which is why saved cards
-- never showed up. This creates it.
--
-- Unlike `wants` (the public shoutout board), rows here are private to the
-- owning user — no cross-user SELECT policy.
--
-- Run this in the Supabase SQL Editor. Idempotent — safe to re-run.

create table if not exists public.want_list (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game text not null,
  card text not null,
  detail text,
  max_price text,
  created_at timestamptz not null default now()
);

create index if not exists want_list_user_idx on public.want_list (user_id, created_at);

alter table public.want_list enable row level security;

drop policy if exists "want_list_select_own" on public.want_list;
create policy "want_list_select_own" on public.want_list
  for select
  using (auth.uid() = user_id);

drop policy if exists "want_list_insert_own" on public.want_list;
create policy "want_list_insert_own" on public.want_list
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "want_list_delete_own" on public.want_list;
create policy "want_list_delete_own" on public.want_list
  for delete
  using (auth.uid() = user_id);

-- no update policy — the client never updates a want-list row, only adds or
-- removes one (addToWatchlist / removeFromWatchlist in App.jsx)

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'want_list'
  ) then
    alter publication supabase_realtime add table public.want_list;
  end if;
end $$;
