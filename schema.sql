-- EJECUTAR EN SUPABASE > SQL EDITOR
create table if not exists public.orders (
 id text primary key,
 created_at timestamptz not null default now(),
 cliente text not null,
 doc text,
 telefono text,
 direccion text,
 producto text not null,
 cantidad integer not null default 1,
 precio numeric(12,2) not null default 0,
 mov_cliente numeric(12,2) not null default 0,
 mov_tienda numeric(12,2) not null default 0,
 total numeric(12,2) not null default 0,
 adelanto numeric(12,2) not null default 0,
 saldo numeric(12,2) not null default 0,
 comprobante text,
 canal text,
 pago text,
 estado text not null default 'En preparación',
 observaciones text,
 vendedor_id uuid references auth.users(id)
);

create sequence if not exists public.order_number_seq start 1;

create or replace function public.next_order_number()
returns bigint language sql security definer as $$
  select nextval('public.order_number_seq');
$$;

alter table public.orders enable row level security;

create policy "authenticated can read orders"
on public.orders for select to authenticated using (true);

create policy "authenticated can insert orders"
on public.orders for insert to authenticated with check (true);

create policy "authenticated can update orders"
on public.orders for update to authenticated using (true) with check (true);

create policy "authenticated can delete orders"
on public.orders for delete to authenticated using (true);

-- Para producción recomendamos reemplazar estas políticas amplias
-- por perfiles vendedor/administrador y permisos por rol.
