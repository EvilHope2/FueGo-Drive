begin;

create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  action_type text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_action_logs_created_idx on public.admin_action_logs(created_at desc);
create index if not exists admin_action_logs_admin_idx on public.admin_action_logs(admin_id, created_at desc);
create index if not exists admin_action_logs_action_idx on public.admin_action_logs(action_type, created_at desc);

alter table public.admin_action_logs enable row level security;

drop policy if exists "admin_action_logs_admin_all" on public.admin_action_logs;

create policy "admin_action_logs_admin_all"
on public.admin_action_logs
for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

commit;
