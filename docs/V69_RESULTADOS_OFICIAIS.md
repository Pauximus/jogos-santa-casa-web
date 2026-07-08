# V69 — Resultados Oficiais Automáticos

## Objetivo

A V69 liga o Push Engine aos resultados oficiais através do backend já usado pela aplicação.

Quando o workflow corre em modo `results` ou quando o scheduler entra numa janela de resultados, o motor:

1. chama `/atualizar` no backend;
2. lê `/resultados`;
3. normaliza os dados;
4. grava/atualiza `draw_results` no Supabase;
5. envia notificação de resultados disponíveis;
6. regista a execução em `push_engine_runs`.

## Importante

Esta versão ainda não calcula prémios automaticamente no servidor. Esse será o passo seguinte.

## Testes recomendados

No GitHub Actions → Push Engine:

- `test` — teste simples de push;
- `reminder` — lembrete manual;
- `results` — importa resultados oficiais e envia notificação;
- `scheduled` — deixa o scheduler decidir.

## SQL

Antes de testar, correr no Supabase:

`supabase_v69_resultados_oficiais.sql`
