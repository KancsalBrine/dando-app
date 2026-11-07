-- Dandó vezetői modul v3.1 – Supabase SQL Editor
-- Csak a manager_* táblákat érinti; a meglévő dando_data táblához nem nyúl.
-- Újrafuttatható azonos sémán (nem töröl adatokat).

create table if not exists public.manager_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  shift_one_name text not null default 'Délelőtt',
  shift_one_start time,
  shift_one_end time,
  shift_two_name text not null default 'Délután',
  shift_two_start time,
  shift_two_end time,
  updated_at timestamptz not null default now()
);

create table if not exists public.manager_shift_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shift_date date not null,
  shift_type text not null check (shift_type in ('one','two')),
  category text not null default 'Egyéb',
  title text not null,
  details text not null default '',
  priority text not null default 'normal' check (priority in ('normal','important','urgent')),
  status text not null default 'open' check (status in ('open','doing','done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists manager_shift_logs_user_date_idx on public.manager_shift_logs(user_id,shift_date desc);

create table if not exists public.manager_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  cadence text not null default 'daily' check (cadence in ('daily','weekly')),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists manager_checks_user_idx on public.manager_checklist_templates(user_id);

create table if not exists public.manager_checklist_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references public.manager_checklist_templates(id) on delete cascade,
  period_key text not null,
  status text not null check (status in ('ok','problem')),
  note text not null default '',
  checked_at timestamptz not null default now(),
  unique (user_id, template_id, period_key)
);
create index if not exists manager_check_entries_user_idx on public.manager_checklist_entries(user_id,period_key);

create table if not exists public.manager_employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  role text not null default '',
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists manager_employees_user_idx on public.manager_employees(user_id);

create table if not exists public.manager_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default '',
  unit text not null default 'db',
  quantity numeric(14,3) not null default 0 check (quantity >= 0),
  minimum numeric(14,3) not null default 0 check (minimum >= 0),
  target numeric(14,3) not null default 0 check (target >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists manager_products_user_idx on public.manager_products(user_id);

create table if not exists public.manager_stock_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.manager_products(id) on delete set null,
  delta numeric(14,3) not null check (delta <> 0),
  quantity_after numeric(14,3) not null check (quantity_after >= 0),
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists manager_moves_user_date_idx on public.manager_stock_movements(user_id,created_at desc);

create table if not exists public.manager_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  supplier text not null,
  items jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','ordered','received','cancelled')),
  expected_on date,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint manager_orders_items_array check (jsonb_typeof(items) = 'array')
);
create index if not exists manager_orders_user_date_idx on public.manager_orders(user_id,created_at desc);

-- Minden adat csak a bejelentkezett tulajdonosé lehet.
-- ALL szabály: SELECT, INSERT, UPDATE, DELETE; anon szerepkör nem kap jogosultságot.
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'manager_preferences','manager_shift_logs','manager_checklist_templates',
    'manager_checklist_entries','manager_employees','manager_products',
    'manager_stock_movements','manager_orders'
  ] loop
    execute format('alter table public.%I enable row level security',tbl);
    execute format('drop policy if exists "Owner access" on public.%I',tbl);
    execute format('create policy "Owner access" on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',tbl);
    execute format('revoke all on public.%I from anon',tbl);
    execute format('grant select, insert, update, delete on public.%I to authenticated',tbl);
  end loop;
end $$;

-- A készletmozgásokat csak az atomikus adatbázis-függvény írhatja.
-- Az authenticated felhasználó csak olvashatja saját mozgásait.
revoke insert, update, delete on public.manager_stock_movements from authenticated;

-- Atomikus készletmódosítás, amely mozgásnaplót is készít.
-- SECURITY DEFINER: kizárólag a tárolt függvény jogosult mozgást beszúrni.
-- A függvény minden módosításnál explicit user_id tulajdonosi feltételt alkalmaz.
create or replace function public.manager_adjust_stock(
  p_product_id uuid,
  p_delta numeric,
  p_note text default ''
) returns numeric
language plpgsql security definer set search_path = ''
as $$
declare v_new_quantity numeric;
begin
  if auth.uid() is null then raise exception 'Bejelentkezés szükséges'; end if;
  if p_delta is null or p_delta = 0 or abs(p_delta) > 1000000 then
    raise exception 'Érvénytelen mennyiség';
  end if;

  update public.manager_products
     set quantity = quantity + p_delta, updated_at = now()
   where id = p_product_id and user_id = auth.uid()
     and quantity + p_delta >= 0
  returning quantity into v_new_quantity;

  if not found then raise exception 'A termék nem található vagy nem elegendő a készlet'; end if;

  insert into public.manager_stock_movements(user_id,product_id,delta,quantity_after,note)
  values(auth.uid(),p_product_id,p_delta,v_new_quantity,coalesce(p_note,''));
  return v_new_quantity;
end;
$$;
revoke all on function public.manager_adjust_stock(uuid,numeric,text) from public, anon;
grant execute on function public.manager_adjust_stock(uuid,numeric,text) to authenticated;

-- Fontos: a névtelen látogatók a bejelentkező képernyőt láthatják,
-- de az adatokat a RLS blokkolja. A publishable kulcs nem titkos kulcs.
