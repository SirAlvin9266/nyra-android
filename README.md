# Nyra Android

Projeto Android em preparação, com compilação em nuvem via GitHub Actions.

## Situação atual
- O fluxo de compilação está em `.github/workflows/android-build.yml`.
- O projeto Android/Gradle ainda precisa ser adicionado antes de gerar o APK.
- A fonte de referência integrada do Nyra e a biblioteca Three.js foram disponibilizadas nesta conversa; elas ainda precisam ser empacotadas na estrutura Android apropriada.

## Compilação
Depois que o projeto Gradle estiver no repositório, abra a aba **Actions**, selecione **Nyra Android Cloud Build** e use **Run workflow**. O APK de depuração aparecerá como artefato quando a compilação terminar com sucesso.
