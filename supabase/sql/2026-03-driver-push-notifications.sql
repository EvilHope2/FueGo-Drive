-- Driver push subscriptions (PWA Web Push)

create table if not exists public.driver_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists driver_push_subscriptions_driver_endpoint_unique
  on public.driver_push_subscriptions(driver_id, endpoint);

create index if not exists driver_push_subscriptions_driver_active_idx
  on public.driver_push_subscriptions(driver_id, is_active);

create index if not exists driver_push_subscriptions_created_at_idx
  on public.driver_push_subscriptions(created_at desc);

drop trigger if exists driver_push_subscriptions_updated_at on public.driver_push_subscriptions;
create trigger driver_push_subscriptions_updated_at
before update on public.driver_push_subscriptions
for each row execute function public.handle_updated_at();

alter table public.driver_push_subscriptions enable row level security;

drop policy if exists "driver_push_subscriptions_select_own" on public.driver_push_subscriptions;
drop policy if exists "driver_push_subscriptions_insert_own" on public.driver_push_subscriptions;
drop policy if exists "driver_push_subscriptions_update_own" on public.driver_push_subscriptions;
drop policy if exists "driver_push_subscriptions_delete_own" on public.driver_push_subscriptions;
drop policy if exists "driver_push_subscriptions_admin_all" on public.driver_push_subscriptions;

create policy "driver_push_subscriptions_select_own"
on public.driver_push_subscriptions
for select
using (driver_id = auth.uid());

create policy "driver_push_subscriptions_insert_own"
on public.driver_push_subscriptions
for insert
with check (driver_id = auth.uid());

create policy "driver_push_subscriptions_update_own"
on public.driver_push_subscriptions
for update
using (driver_id = auth.uid())
with check (driver_id = auth.uid());

create policy "driver_push_subscriptions_delete_own"
on public.driver_push_subscriptions
for delete
using (driver_id = auth.uid());

create policy "driver_push_subscriptions_admin_all"
on public.driver_push_subscriptions
for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');
