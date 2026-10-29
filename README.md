# Nyra Android

Aplicativo Android em desenvolvimento para empacotar o Nyra 3D Studio com recursos locais e compilação na nuvem pelo GitHub Actions.

## Estado deste commit

- Estrutura inicial do projeto Android/Gradle em `android/`.
- Atividade Android que abre os assets locais via WebView.
- Fluxo GitHub Actions para produzir um APK de depuração.
- Tela de entrada **provisória** em `android/app/src/main/assets/www/index.html`.

## Ainda não está pronto

A página de referência integrada `Nyra_3D_Studio_Teste_Integrado_v3.html` ainda não foi integrada a este projeto. O conteúdo da tela atual é apenas um placeholder, não os três editores funcionais. Os módulos locais Three.js e JSZip também ainda precisam ser empacotados. Portanto, este repositório ainda não representa uma versão funcional completa e o APK não deve ser considerado concluído.

## Plano de integração

1. Integrar a página integrada de referência sem trocar o conteúdo dos editores.
2. Identificar as dependências externas usadas pelas páginas internas.
3. Incluir localmente as dependências essenciais a partir do arquivo `three.js-master.zip` fornecido para este projeto, respeitando sua licença.
4. Testar a compilação e os três editores em Android/WebView.
5. Confirmar salvamento e exportação no aparelho; então avaliar dependências realmente opcionais de internet.

## Compilação em nuvem

Abra **Actions** → **Nyra Android Cloud Build** → **Run workflow**. O workflow deve gerar o APK quando o projeto estiver completo e o build passar. O estado atual não garante que a integração ainda incompleta funcione.
