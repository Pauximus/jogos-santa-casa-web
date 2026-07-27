-- V84.0 — Tokens Firebase Cloud Messaging por utilizador/dispositivo
create table if not exists public.native_push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  token text not null unique,
  platform text not null default 'android',
  app_version text,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists native_push_tokens_profile_idx on public.native_push_tokens(profile_id);
create index if not exists native_push_tokens_enabled_idx on public.native_push_tokens(enabled) where enabled = true;
alter table public.native_push_tokens enable row level security;
drop policy if exists "native tokens select own" on public.native_push_tokens;
create policy "native tokens select own" on public.native_push_tokens for select using (auth.uid() = profile_id);
drop policy if exists "native tokens insert own" on public.native_push_tokens;
create policy "native tokens insert own" on public.native_push_tokens for insert with check (auth.uid() = profile_id);
drop policy if exists "native tokens update own" on public.native_push_tokens;
create policy "native tokens update own" on public.native_push_tokens for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
drop policy if exists "native tokens delete own" on public.native_push_tokens;
create policy "native tokens delete own" on public.native_push_tokens for delete using (auth.uid() = profile_id);
