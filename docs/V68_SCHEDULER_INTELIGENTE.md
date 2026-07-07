# V68 — Scheduler Inteligente

Esta versão consolida o Push Engine antes da ligação aos resultados oficiais.

## Inclui

- Scheduler inteligente no GitHub Actions.
- Modos manuais: `test`, `reminder`, `soon`, `results`, `scheduled`.
- Registo das execuções em `push_engine_runs`.
- Monitor visível na app dentro de Cloud & Push.
- Próxima execução estimada.
- Última execução, última notificação e dispositivos Push.

## SQL necessário

Executar no Supabase:

```sql
supabase_v68_scheduler_inteligente.sql
```

## Teste

GitHub → Actions → Push Engine → Run workflow.

Testar primeiro `test`, depois `reminder`, `soon` e `results`.
