# V70 — Sistema Inteligente de Prémios

## Objetivo

A V70 adiciona cálculo automático de prémios ao Push Engine.

Quando o workflow corre em modo `results`, o motor:

1. importa os resultados oficiais para `draw_results`;
2. lê as apostas guardadas na cloud;
3. compara apostas com o resultado oficial;
4. grava prémios encontrados em `historico_premios`;
5. envia Push Notification personalizada aos utilizadores com prémio.

## Tabelas usadas

- `draw_results`
- `apostas_guardadas`
- `historico_premios`
- `push_subscriptions`
- `notification_log`
- `push_engine_runs`

## Teste recomendado

1. Correr `supabase_v70_premios_automaticos.sql` no Supabase.
2. Publicar a versão no GitHub.
3. GitHub → Actions → Push Engine → Run workflow → `results`.
4. Confirmar logs do workflow.
5. Abrir a app e carregar em **Sincronizar cloud**.

## Notas

A V70 não substitui a verificação visual da app; adiciona uma camada automática no backend. O histórico continua compatível com a app existente.
