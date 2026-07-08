-- V69 - Resultados Oficiais Automáticos
-- Prepara a tabela draw_results para importação automática pelo Push Engine.

alter table public.draw_results
add column if not exists result_signature text;

alter table public.draw_results
add column if not exists updated_at timestamptz default now();

alter table public.draw_results
add column if not exists raw jsonb;

create index if not exists idx_draw_results_game_date
on public.draw_results(game, draw_date desc);

create index if not exists idx_draw_results_updated_at
on public.draw_results(updated_at desc);

notify pgrst, 'reload schema';
