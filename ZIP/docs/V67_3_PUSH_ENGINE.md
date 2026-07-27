# V67.3 — GitHub Actions Push Engine

Esta versão liga o Push Engine ao GitHub Actions.

## O que faz

- Permite executar uma notificação de teste manual no GitHub.
- Executa automaticamente nos dias de EuroMilhões e Totoloto.
- Usa Supabase para ler `push_subscriptions`.
- Usa Web Push/VAPID para enviar a notificação.
- Regista envios em `notification_log`.
- Evita notificações duplicadas.

## Secrets necessários no GitHub

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

## Primeiro teste

1. Publicar esta versão.
2. Abrir a app no telemóvel.
3. Permitir notificações.
4. Clicar em **Registar Push Cloud**.
5. Fechar a app.
6. Ir ao GitHub > Actions > Push Engine > Run workflow.
7. Escolher `test`.
8. Confirmar se a notificação chega.

## Nota

A V67.3 envia testes e lembretes automáticos.
A comparação automática com prémios fica para a próxima fase.
