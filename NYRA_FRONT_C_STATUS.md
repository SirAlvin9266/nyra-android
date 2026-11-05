# Nyra 3D Studio — Estado da Frente C

**Branch:** work/nyra-front-c-closeout  
**Main:** não alterada / sem autorização de merge.

## C1 — Interface, importação e exportação
- O botão funcional Importar modelo 3D e seletor nyraModelFiles foram preservados.
- Nyra Scene Project v1 tem importação/exportação separadas dos formatos 3D.
- Character+Voxel v4 é aceito pelo importador; a exportação JSON atual é Nyra Scene Project v1, não Character+Voxel v4.
- Corrigido o estado dos botões: após importação bem-sucedida, BBModel, JSON e Diagnóstico também ficam habilitados, não apenas GLB/OBJ/STL.
- A exportação Nyra Scene Project v1 serializa a cena editada: hierarquia, transforms, geometria (posições/índices), UVs, normais, grupos e propriedades básicas de materiais.
- Limite: a exportação JSON não embute payload binário de imagens/texturas; Character+Voxel v4 é um formato de entrada, não o formato da exportação atual.

## C2 — Guia
- Guia contextual com 23 etapas mantido.
- Navegação numérica, anterior/próximo, alvos e estados existentes preservados.
- Conteúdo documental atualizado para distinguir os dois esquemas JSON e o escopo real do cache.

## C3 — Robô-guia oficial
- A fonte nyra_personagem.json é empacotada nos assets Android.
- O robô lê e valida Character+Voxel v4, usando parts, colors e transforms do arquivo; não mantém cópia dos transforms oficiais hardcoded no JavaScript.
- Fallback 2D permanece disponível.
- Limite da fonte: voxels e objects vazios; as partes são representadas por geometrias proxy, não por uma malha voxel-art final.

## C4 — Desempenho
- Mantidas métricas de cena, renderer, frame time, long tasks e heap quando disponível.
- Adicionados eventos de duração para leitura e parse de GLB/glTF, OBJ, FBX, STL e JSON; BBModel também registra duração de importação.
- Evento `scene_build_and_commit` e duração total da importação registrados; o cronômetro é compartilhado corretamente entre a seleção e a confirmação da cena.
- Relatório exportável nyra-performance-report.json.
- Pendência: benchmark comparativo no aparelho de referência e otimização somente após análise dos resultados. CI não comprova desempenho físico.

## C5 — Cache e robustez
- Temporários de exportação foram isolados em getCacheDir()/nyra-rebuildable.
- A interface consulta quantidade/tamanho/limite e limpa somente arquivos nyra-export-*.
- Política automática: até 512 MiB no total; temporários abandonados com mais de 7 dias são removidos com segurança ao iniciar o app ou preparar uma nova exportação. Cada exportação individual continua limitada a 256 MiB.
- A limpeza é bloqueada se houver transfers, documentos pendentes, fila de exportação ou seletor nativo em uso.
- Projetos e rascunhos não são tocados. O limite agregado também é verificado durante a gravação dos blocos.
- Limite deliberado: isto gerencia temporários de exportação, não é um cache genérico de previews/meshes nem armazenamento persistente de projetos. Não afirmar gestão de cache de projetos enquanto esse armazenamento separado não existir.

## Verificação automatizada
- O workflow inclui auditoria Front C, auditorias existentes, build debug e inspeção do APK.
- A inspeção do APK passa a exigir nyra_personagem.json e marcadores da interface C.
- Verificação CI deve ocorrer no PR do branch e permanecer verde antes de release.

## Fechamento técnico remoto — 2026-11-05

**Resultado: implementação da Frente C e gates automatizados remotos concluídos. Validação de release em dispositivo real permanece aberta.**

Evidência GitHub Actions:
- Workflow run #401 / run ID `42110167560`, commit `bc7095a01ec56d58bc7d24c0d2fd6bb7dcbe2872`: conclusão `success`.
- Auditoria Front C: PASS.
- Todas as auditorias adicionais: PASS.
- `./gradlew --no-daemon assembleDebug`: `BUILD SUCCESSFUL`.
- Auditoria de recursos offline dentro do APK: PASS.
- Artefato `nyra-android-debug-apk` publicado (artifact ID `13455080360`; 2.025.304 bytes).
- SHA-256 do APK produzido no job: `5bede85602be02db01158da01d8cd2f5f908a047df9832c3844a031228af5373`.
- PR #8 sem comentários nem threads de revisão pendentes na consulta de 2026-11-05.

O que está fechado remotamente: código da Frente C descrito nas seções C1–C5, auditorias automatizadas e compilação/verificação do APK.

O que não pode ser declarado aprovado pelo CI: compatibilidade prática de URIs e seletor Android, rotação/retomada, comportamento do WebView/WebGL, pressão de memória, limpeza segura em operações reais e benchmark do modelo grande no mesmo aparelho. Esses itens permanecem no roteiro físico abaixo. Não inventar aprovação nem substituir ensaio real por teste de código.

**Status de integração:** PR #8 continua aberto em draft. A branch `main` não foi alterada. A Frente B continua fora do escopo desta branch.
