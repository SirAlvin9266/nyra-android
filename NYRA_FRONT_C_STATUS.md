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

## Auditoria honesta de fechamento — 2026-11-05

**Conclusão: a branch passou pelos gates remotos, mas a Frente C ainda NÃO está integralmente implementada nem pronta para release.** O CI #403 (commit `a06d5ec0937a691375fcf3680a8dfa77965d0a50`) passou nas auditorias, compilação e inspeção de APK. Isso comprova integridade de build e testes automatizados existentes; não comprova os requisitos funcionais abaixo que ainda não foram construídos.

### O que está implementado e coberto parcialmente
- C1: seletor existente preservado; importação de formatos listados; exportação/reimportação básica `Nyra Scene Project v1`; teste automatizado round-trip cobre uma malha triangular simples, UV, índices, grupo e material único.
- C2: 23 etapas com explicações, estados e alvos. A auditoria automatizada verifica a quantidade e marcadores; a navegação/alvos reais ainda precisam de ensaio.
- C3: robô renderizado a partir da estrutura Character+Voxel v4 e fallback 2D. Como `voxels` e `objects` estão vazios, as partes são cuboides proxy, não um personagem voxel final.
- C5: temporários de exportação em `getCacheDir()/nyra-rebuildable`, com limite individual/agregado, retenção e limpeza protegida. Isto é gestão de temporários de exportação, não a estratégia ampla de cache derivado de projetos descrita no roadmap.

### Pendências de implementação (não são resolvidas apenas testando no celular)
1. **C1 — interoperabilidade JSON:** `Nyra Scene Project v1` é um esquema diferente da DSL v1 do Gerador Matemático (`components`) e de Character+Voxel v4 (`parts/voxels/objects`). Não há evidência de adaptador de ida/volta entre esses esquemas. O exportador de cena também não serializa clips de animação, dados de skinning/skeleton ou payload binário de texturas/imagens. O round-trip automatizado atual não cobre rigs, animações, múltiplos materiais, texturas ou modelos complexos.
2. **C4 — otimização:** a instrumentação foi adicionada, mas não há benchmark comparativo concluído nem otimizações demonstradas a partir de medições. A estratégia de pixel ratio adaptativo, renderização sob demanda e redução de custo de geometria/material/draw calls ainda precisa ser avaliada e implementada quando os dados justificarem.
3. **C4 — importação grande:** há mensagens de estado e confirmações antes de tentar arquivos pesados, mas não há progresso percentual nem cancelamento efetivo durante o parse/import em andamento. O cancelamento existente é anterior ao início da carga.
4. **C5 — cache derivado:** ainda não existe o cache gerenciável de cópias de trabalho, previews, thumbnails e geometrias processadas descrito no roadmap, nem política completa de validação de integridade/reconstrução desses itens. O código atual cobre somente temporários de exportação.
5. **C1/C2/C5 — integração real:** layout móvel/acessibilidade, alvos do guia, URIs/ClipData, permissões, rotação, retomada, pressão de memória e fluxos de salvamento precisam de testes no aparelho.

### Correção de ciclo de vida do robô
- Identificado que fechar o guia escondia a janela, mas deixava a animação 3D ativa.
- Corrigido em `d9cb38c79f4704ee3b3d7801ed2497085afbe3da`: fechar o guia agora interrompe a animação, descarta renderer/recursos e permite inicialização limpa na próxima abertura.
- Auditoria automatizada ampliada em `020fe8a04beb7a5fb7a6f1176f138727eb1ba684` para impedir regressão. A execução CI desse HEAD ainda precisa concluir.

### Estado de release
- CI #403 no commit anterior: PASS, incluindo APK debug e auditoria de assets offline.
- CI #405 no HEAD com a correção de ciclo de vida: em execução no momento deste registro.
- PR #8 permanece draft; não mesclar na `main`.
- A Frente B permanece separada.
- O roteiro físico em `docs/NYRA_FRONT_C_VALIDACAO_FISICA.md` continua obrigatório, mas não é a única pendência: os itens de implementação acima também precisam ser resolvidos antes de declarar a Frente C concluída.
