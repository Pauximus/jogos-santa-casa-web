# Assistente Jogos Santa Casa — Base V92 organizada

Esta versão preserva a lógica funcional da V92.0 e aplica apenas uma correção segura:
remove o `MutationObserver` que chamava `tick()` em resposta às alterações feitas pelo próprio `tick()`.

## Fluxo recomendado

1. Alterar apenas os ficheiros da raiz.
2. Executar `scripts\SINCRONIZAR_WEB_ANDROID.bat`.
3. Confirmar `PROJETO SAUDÁVEL`.
4. Android Studio: Clean Project → Assemble Project → Run.
5. Só depois fazer commit.

## Diagnóstico

Executar `scripts\JSC_DOCTOR.bat`.

O Doctor confirma:
- sintaxe JavaScript como script clássico de browser;
- versão do splash;
- igualdade raiz / www / Android;
- presença do observer autorrecursivo conhecido;
- ficheiros obrigatórios;
- validade do package.json.

## Git

Ativar uma vez o hook:

`git config core.hooksPath .githooks`

A partir daí, cada commit executa o JSC Doctor automaticamente.
