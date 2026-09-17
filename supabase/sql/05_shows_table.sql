-- Vendor-created shows/events. Replaces the hardcoded SHOWS array in
-- src/App.jsx with a live table: everyone can browse shows, but only
-- Verified Dealer accounts (profiles.dealer = true) can create one, and
-- only as themselves. Only the creator can update/delete their own show.
--
-- `id` is TEXT (not uuid, unlike this project's other tables) so the
-- one-time seed below can reuse the exact string ids ("s1".."s4") the old
-- hardcoded SHOWS array used — those are the ids that existing `wants`
-- rows already have in their `show_id` column, so keeping them avoids
-- having to migrate `wants` itself. New shows created through the app
-- still get a random id via the default below.
--
-- `created_by` is nullable: the one-time seed rows have no real creator
-- (they're a snapshot of the old hardcoded data), so they're left
-- unowned. RLS naturally makes an unowned show un-editable by anyone
-- (created_by = auth.uid() can never match null), which is the right
-- behavior for that legacy data.
--
-- Run this in the Supabase SQL Editor. Idempotent — safe to re-run.

create table if not exists public.shows (
  id text primary key default gen_random_uuid()::text,
  created_by uuid references public.profiles(id) on delete set null,
  name text not null,
  venue text,
  lat double precision,
  lng double precision,
  start_at timestamptz not null,
  end_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists shows_start_at_idx on public.shows (start_at);

alter table public.shows enable row level security;

drop policy if exists "shows_select_all" on public.shows;
create policy "shows_select_all" on public.shows
  for select
  using (true);

drop policy if exists "shows_insert_dealer_self" on public.shows;
create policy "shows_insert_dealer_self" on public.shows
  for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.dealer = true
    )
  );

drop policy if exists "shows_update_own" on public.shows;
create policy "shows_update_own" on public.shows
  for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "shows_delete_own" on public.shows;
create policy "shows_delete_own" on public.shows
  for delete
  using (created_by = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shows'
  ) then
    alter publication supabase_realtime add table public.shows;
  end if;
end $$;

-- One-time seed: recreates the 4 shows that used to be hardcoded in
-- App.jsx's SHOWS array, using the same ids, names, venues and
-- coordinates, so `wants` rows already pointing at "s1".."s4" keep
-- resolving to a real show instead of a dangling id. Dates below are a
-- fixed snapshot (Singapore time) rather than "always today" — that's
-- fine, since going forward real shows come from the Create Show flow
-- with real dates. Safe to re-run (on conflict does nothing).

insert into public.shows (id, created_by, name, venue, lat, lng, start_at, end_at) values
  ('s1', null, 'One Piece Card Game SG Regional Qualifier', 'Suntec Singapore Convention Centre', 1.2966, 103.8577, '2026-09-17 09:00:00+08', '2026-09-17 17:00:00+08'),
  ('s2', null, 'Pokémon TCG Community League Night', 'Games Mansion, Peninsula Shopping Centre', 1.2936, 103.8500, '2026-09-17 10:00:00+08', '2026-09-17 16:00:00+08'),
  ('s3', null, 'Bishan Card Traders Meetup', 'Bishan Community Club, Hall 2', 1.3506, 103.8496, '2026-09-18 09:00:00+08', '2026-09-18 18:00:00+08'),
  ('s4', null, 'Toa Payoh Bounty Hunters One Piece Meet', 'Toa Payoh HDB Hub, Atrium', 1.3326, 103.8489, '2026-09-19 11:00:00+08', '2026-09-19 19:00:00+08')
on conflict (id) do nothing;

-- Optional but recommended: once the seed above has run, every existing
-- `wants.show_id` should point at a real row in `shows`. This adds a real
-- foreign key so that stays true going forward. Skip/comment this out if
-- you have `wants` rows whose show_id doesn't match "s1".."s4" (e.g. from
-- ad-hoc test data) — it'll fail loudly rather than silently, so you can
-- clean those up first and re-run.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'wants_show_id_fkey'
  ) then
    alter table public.wants
      add constraint wants_show_id_fkey foreign key (show_id) references public.shows(id);
  end if;
end $$;
