-- DailyNest private cloud snapshots, independent of your existing feature tables.
-- This migration does not erase or rename existing tables or local records.
begin;
create table if not exists public.dailynest_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint dailynest_state_max_size check (octet_length(data::text) <= 4194304)
);
alter table public.dailynest_state enable row level security;
revoke all on table public.dailynest_state from public, anon;
grant select, insert, update on table public.dailynest_state to authenticated;
drop policy if exists dailynest_read_own on public.dailynest_state;
drop policy if exists dailynest_insert_own on public.dailynest_state;
drop policy if exists dailynest_update_own on public.dailynest_state;
create policy dailynest_read_own on public.dailynest_state
  for select to authenticated using ((select auth.uid()) = user_id);
create policy dailynest_insert_own on public.dailynest_state
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy dailynest_update_own on public.dailynest_state
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Expected-revision comparison prevents silent last-writer-wins overwrites.
-- Caller identity is taken from Auth, not a user-supplied user_id argument.
create or replace function public.dailynest_save_state(
  p_data jsonb,
  p_expected_revision integer default null
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_revision integer;
  v_time timestamptz;
begin
  if v_user is null then raise exception 'Sign in before saving.'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'The app state must be a JSON object.';
  end if;
  -- Serialize writes even when no row exists yet.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text, 0));
  select revision into v_revision from public.dailynest_state
    where user_id = v_user for update;
  if found then
    if p_expected_revision is distinct from v_revision then
      return jsonb_build_object('ok',false,'conflict',true,'revision',v_revision);
    end if;
    update public.dailynest_state set data=p_data,
      revision=revision+1,updated_at=now()
      where user_id=v_user returning revision,updated_at into v_revision,v_time;
  else
    if p_expected_revision is not null then
      return jsonb_build_object('ok',false,'conflict',true);
    end if;
    insert into public.dailynest_state(user_id,data,revision)
      values(v_user,p_data,1) returning revision,updated_at into v_revision,v_time;
  end if;
  return jsonb_build_object('ok',true,'revision',v_revision,'updated_at',v_time);
end;
$$;
revoke all on function public.dailynest_save_state(jsonb,integer) from public, anon;
grant execute on function public.dailynest_save_state(jsonb,integer) to authenticated;
commit;
