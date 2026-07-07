-- V67.2 - Push Engine
-- Este SQL reforça as policies necessárias para a app registar subscrições Push
-- e para o GitHub Actions, via service_role, enviar notificações sem abrir a app.

alter table public.push_subscriptions enable row level security;
alter table public.notification_log enable row level security;

drop policy if exists "push_subscriptions_all_own" on public.push_subscriptions;
create policy "push_subscriptions_all_own"
on public.push_subscriptions
for all
using (true)
with check (true);

drop policy if exists "notification_log_all_own" on public.notification_log;
create policy "notification_log_all_own"
on public.notification_log
for all
using (true)
with check (true);

create index if not exists idx_push_subscriptions_enabled on public.push_subscriptions(enabled);
create index if not exists idx_notification_log_profile_game on public.notification_log(profile_id, game, draw_number, notification_type);
