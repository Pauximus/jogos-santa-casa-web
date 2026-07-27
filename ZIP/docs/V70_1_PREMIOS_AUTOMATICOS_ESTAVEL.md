# V70.1 — Prémios Automáticos Estável

Correção do Push Engine para evitar erro 409 quando um resultado oficial já existe em `draw_results`.

## Alterações

- Importação de resultados oficiais passa a usar lógica segura: procurar, atualizar se existir, criar se não existir.
- Evita duplicados na constraint `draw_results_game_draw_number_key`.
- Mantém o cálculo automático de prémios e o histórico.
- `APP_VERSION = v70.1-premios-automaticos-estavel`.
