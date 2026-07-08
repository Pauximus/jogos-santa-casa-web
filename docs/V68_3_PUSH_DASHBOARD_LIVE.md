# V68.3 - Push Dashboard Live

Correção do painel Cloud & Push.

## Alterações

- A app passa a chamar `v68CarregarEstadoPushEngine()` durante a sincronização cloud.
- Leitura direta da tabela `push_engine_runs`.
- Compatibilidade com colunas `notification_title`/`title` e `subscriptions_count`/`enabled_subscriptions`.
- Atualização da versão para `v68.3-push-dashboard-live`.
- Atualização do cache do Service Worker para evitar ficheiros antigos.

## Teste

1. Executar Push Engine no GitHub Actions.
2. Abrir app.
3. Clicar em Sincronizar cloud.
4. Confirmar que aparecem última execução, última notificação e dispositivos push.
