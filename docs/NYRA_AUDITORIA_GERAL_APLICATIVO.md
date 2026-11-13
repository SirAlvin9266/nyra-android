# Nyra — Revisão geral do aplicativo

**Escopo atualizado:** revisão de produto, experiência, arquitetura e simplificação de toda a aplicação. Este documento substitui a interpretação estreita de "auditoria geral" como mera lista de bugs por editor.

O diagnóstico principal e a proposta arquitetural estão em `docs/NYRA_REVISAO_ARQUITETURA_E_SIMPLIFICACAO.md`.

## Objetivo

Investigar o que torna a Nyra mais complexa, pesada ou insatisfatória do que precisa ser, principalmente pela concentração de código em HTML/JavaScript gerado e pelo acoplamento entre shell, editores, Android e serviços. Identificar o que pode ser simplificado, consolidado, modularizado ou redesenhado sem perder capacidades existentes.

## Evidências iniciais

- Shell integrado: `android/app/src/main/assets/www/index.html`, cerca de 206 KB.
- Três documentos de editor são armazenados como payloads Base64 no shell.
- Payloads decodificados: Oficina ~20 KB; Criador ~50 KB; RoboTV ~23 KB.
- Shell mistura navegação, zoom, modo desktop, Guia, diagnóstico, persistência, iframes, bridge e adaptadores.
- Adaptador de importação/exportação 3D e DSL injeta uma tela e lógica extensa no Criador por strings HTML/JavaScript.
- MainActivity.java: cerca de 17 KB, com WebView, AssetLoader, seletor SAF, transferências de exportação, callbacks e ciclo de vida.
- Three.js e JSZip são preparados no Gradle e empacotados offline com verificação de hashes.

## Linhas de investigação

1. Experiência e interface: arquitetura de informação, consistência visual, densidade, navegação e fluxos dos três editores.
2. HTML e geração dinâmica: extrair documentos codificados e scripts injetados, entender se há vantagens reais no desenho atual.
3. Modularidade: separar shell, editores, domínio, IO, persistência, renderização, guia e camada Android por fronteiras claras.
4. Android/WebView: definir com clareza o que exige código nativo e o que funciona melhor como interface web local.
5. Estado e projetos: eliminar persistência implícita/duplicada e definir contratos versionados.
6. Testabilidade: permitir testar lógica de domínio e contratos sem depender do WebView sempre que possível.
7. Migração: comparar modularização incremental com aumento de UI nativa e reescrita maior.

## Proteções

- A Frente D está congelada e fora desta revisão.
- Não alterar main nem fazer merge automático de branches/PRs.
- Não substituir HTML por nativo apenas por preferência tecnológica.
- Não multiplicar arquivos sem responsabilidades definidas.
- Não iniciar reescrita integral antes de ter mapa, evidência, custos e plano.
- Não confundir presença de HTML com defeito: o foco é complexidade estrutural e experiência.

## Status

O mapa de arquitetura e a proposta conceitual foram iniciados. Ainda falta detalhar UX, contratos, duplicações, dependências e opções de migração. Nenhuma refatoração funcional foi iniciada.
