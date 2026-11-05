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

## Fechamento de release ainda necessário
- Completar docs/NYRA_FRONT_C_VALIDACAO_FISICA.md num aparelho real.
- Benchmark do modelo grande no mesmo aparelho/arquivo.
- Revisão visual das 23 etapas e do robô no WebView real.
- Não mesclar na main até a validação física e decisão explícita do usuário.

**Frente B permanece integralmente fora deste branch/escopo:** topologia, seleção localizada, superfícies, extrusão/loft, roupas, operações avançadas de malha e avaliação/evolução do gerador JSON.
