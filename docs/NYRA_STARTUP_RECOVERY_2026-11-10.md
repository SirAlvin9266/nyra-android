# Nyra Android — recuperação de inicialização (10/11/2026)

## Objetivo
Disponibilizar uma compilação de recuperação baseada no último baseline que preserva a inicialização eager dos três editores e não inclui as mudanças de inicialização introduzidas na rodada física do PR #12.

## Baseline escolhido
- Branch de origem: `main`
- Commit: `0e131923f051b145f6ae92b92c73751e030964fd`
- A mensagem do commit registra a integração validada e a restauração da inicialização eager, confirmada anteriormente no aparelho.
- A recuperação é isolada nesta branch. A `main` não foi alterada.

## Escopo desta entrega
- Recompilar a base estável anterior às mudanças de 10/11.
- Executar novamente as auditorias existentes, o build Gradle e a verificação de assets offline.
- Publicar o APK e seu SHA-256 juntos no artefato do GitHub Actions, identificando o commit exato.
- Não integrar o PR #10 (ícone) nem o PR #12 (alterações físicas) nesta compilação.

## O que esta entrega NÃO afirma
Esta é uma recuperação do baseline, não a conclusão de todos os defeitos observados no teste físico. Permanecem separados para correção e reteste:
- pintura por toque/arraste da Oficina de Itens;
- responsividade e posicionamento de controles no Android;
- fidelidade de importação BBModel e recursos externos;
- integração do robô 3D ao guia;
- fluxo de importação/clips/timeline de animação;
- persistência integral de projetos e recursos externos.

O CI confirma auditorias e compilação, mas não comprova interação real do WebView no aparelho. O teste físico do APK recuperado é obrigatório antes de considerar a recuperação confirmada.

## Proteções
- Não alterar `main`.
- Não mesclar PRs existentes.
- Manter esta branch e seu PR em draft até a validação física.
- Não reutilizar APKs/artifacts de outros commits ou branches como se fossem desta recuperação.
