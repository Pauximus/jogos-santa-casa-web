# V68.2 — Push Dashboard Fix

Correção do painel Cloud & Push para ler corretamente a tabela `push_engine_runs`.

## Alterações

- APP_VERSION atualizado para `v68.2-push-dashboard-fix`.
- Leitura da coluna `title` em vez de `notification_title`.
- Leitura da coluna `enabled_subscriptions` em vez de `subscriptions_count`.
- O painel passa a apresentar:
  - estado do Push Engine;
  - última execução;
  - próxima execução estimada;
  - última notificação;
  - dispositivos/subscrições Push.
