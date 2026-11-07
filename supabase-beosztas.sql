-- Dandó V3.2: havi műszakbeosztás; Supabase SQL Editorban egyszer futtatandó.
create table if not exists public.manager_rosters (
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  entries jsonb not null default '{}'::jsonb check (jsonb_typeof(entries) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);
create or replace function public.manager_rosters_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
drop trigger if exists manager_rosters_touch_trigger on public.manager_rosters;
create trigger manager_rosters_touch_trigger before update on public.manager_rosters
for each row execute function public.manager_rosters_touch();
alter table public.manager_rosters enable row level security;
drop policy if exists "manager_rosters_select" on public.manager_rosters;
drop policy if exists "manager_rosters_insert" on public.manager_rosters;
drop policy if exists "manager_rosters_update" on public.manager_rosters;
create policy "manager_rosters_select" on public.manager_rosters for select to authenticated using ((select auth.uid()) = user_id);
create policy "manager_rosters_insert" on public.manager_rosters for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "manager_rosters_update" on public.manager_rosters for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update on public.manager_rosters to authenticated;
