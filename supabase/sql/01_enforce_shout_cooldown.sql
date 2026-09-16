-- Server-side enforcement of the free-plan hourly shout cooldown.
-- Run this in the Supabase SQL Editor (Database > SQL Editor) on the project
-- that backs this app. The client-side cooldown check in App.jsx stays as a
-- UX nicety, but this trigger is what actually stops a bypass (e.g. someone
-- calling the API directly, or racing two tabs).
--
-- Premium accounts (profiles.premium = true) are exempt, matching the
-- client-side FREE_SHOUT_COOLDOWN_MS gate.

create or replace function public.enforce_shout_cooldown()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_premium boolean;
  last_ts timestamptz;
begin
  select premium into is_premium from public.profiles where id = new.user_id;
  if coalesce(is_premium, false) then
    return new;
  end if;

  select max(created_at) into last_ts
  from public.wants
  where user_id = new.user_id;

  if last_ts is not null and (now() - last_ts) < interval '1 hour' then
    raise exception 'Free plan allows one shoutout per hour. Try again later or upgrade to Premium.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_shout_cooldown on public.wants;

create trigger trg_enforce_shout_cooldown
before insert on public.wants
for each row execute function public.enforce_shout_cooldown();
