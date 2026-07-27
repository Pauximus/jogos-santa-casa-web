-- V67.0 Cloud Foundation
-- Tabelas base para multiutilizador, dispositivos e notificações.
-- Este ficheiro acompanha a versão, mesmo que já tenhas corrido o SQL manualmente no Supabase.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key,
  email text unique,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.devices (
  id uuid primary key,
  profile_id uuid references public.profiles(id) on delete cascade,
  device_name text,
  user_agent text,
  last_seen_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  device_id uuid references public.devices(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.draw_results (
  id uuid primary key default gen_random_uuid(),
  game text not null,
  draw_number text not null,
  draw_date date,
  numbers jsonb not null,
  stars jsonb,
  official_prize_info jsonb,
  created_at timestamptz default now(),
  unique(game, draw_number)
);

create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  game text,
  draw_number text,
  notification_type text not null,
  title text not null,
  body text,
  sent_at timestamptz default now(),
  unique(profile_id, game, draw_number, notification_type)
);

alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.draw_results enable row level security;
alter table public.notification_log enable row level security;
