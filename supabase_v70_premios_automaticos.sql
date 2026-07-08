-- V70 - Prémios Automáticos
-- O Push Engine passa a calcular prémios a partir dos resultados oficiais
-- e a gravar automaticamente no histórico de prémios.

-- Garante que a tabela de histórico tem os campos usados pela app.
create table if not exists public.historico_premios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  jogo text,
  aposta text,
  premio text,
  sorteio text,
  acertos text,
  data_sorteio date,
  data_registo timestamptz default now()
);

alter table public.historico_premios
add column if not exists user_id uuid;

alter table public.historico_premios
add column if not exists jogo text;

alter table public.historico_premios
add column if not exists aposta text;

alter table public.historico_premios
add column if not exists premio text;

alter table public.historico_premios
add column if not exists sorteio text;

alter table public.historico_premios
add column if not exists acertos text;

alter table public.historico_premios
add column if not exists data_sorteio date;

alter table public.historico_premios
add column if not exists data_registo timestamptz default now();

create index if not exists idx_historico_premios_user_data
on public.historico_premios(user_id, data_registo desc);

create index if not exists idx_historico_premios_user_sorteio
on public.historico_premios(user_id, jogo, sorteio);

-- Campos de resumo na tabela do Push Engine.
alter table public.push_engine_runs
add column if not exists prizes_checked int default 0;

alter table public.push_engine_runs
add column if not exists prizes_found int default 0;

alter table public.push_engine_runs
add column if not exists prizes_new int default 0;

notify pgrst, 'reload schema';
