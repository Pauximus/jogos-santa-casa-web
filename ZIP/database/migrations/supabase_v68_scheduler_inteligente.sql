-- V68 - Scheduler Inteligente / Monitor do Push Engine

create table if not exists public.push_engine_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null default 'scheduled',
  status text not null default 'running',
  game text,
  draw_number text,
  notification_type text,
  notification_title text,
  subscriptions_count int default 0,
  sent int default 0,
  skipped int default 0,
  disabled int default 0,
  failed int default 0,
  message text,
  app_version text,
  started_at timestamptz default now(),
  finished_at timestamptz
);

alter table public.push_engine_runs enable row level security;

drop policy if exists "push_engine_runs_read_all" on public.push_engine_runs;
create policy "push_engine_runs_read_all"
on public.push_engine_runs
for select
using (true);

drop policy if exists "push_engine_runs_write_all" on public.push_engine_runs;
create policy "push_engine_runs_write_all"
on public.push_engine_runs
for all
using (true)
with check (true);

create index if not exists idx_push_engine_runs_started_at on public.push_engine_runs(started_at desc);
create index if not exists idx_push_engine_runs_status on public.push_engine_runs(status);
