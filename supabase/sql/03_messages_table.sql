-- Real chat backend. Chat was never wired to Supabase — `threads` in
-- App.jsx was pure local useState (SEED_THREADS + in-memory sends), so two
-- different accounts could never see each other's messages. This creates
-- the `messages` table the client now reads/writes/subscribes to.
--
-- Run this in the Supabase SQL Editor. Idempotent — safe to re-run.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_sender_idx on public.messages (sender_id, created_at);
create index if not exists messages_recipient_idx on public.messages (recipient_id, created_at);

alter table public.messages enable row level security;

drop policy if exists "messages_select_participant" on public.messages;
create policy "messages_select_participant" on public.messages
  for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "messages_insert_as_sender" on public.messages;
create policy "messages_insert_as_sender" on public.messages
  for insert
  with check (auth.uid() = sender_id);

-- no update/delete policy — messages are immutable once sent (matches the
-- rest of the app's model; add one later if you want edit/unsend)

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
