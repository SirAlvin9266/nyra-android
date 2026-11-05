# Nyra 3D Studio — Validação física de fechamento da Frente C

**Este roteiro é uma validação de release.** Não marcar como aprovado apenas por CI ou build.

## Identificação do ensaio
- Commit/branch:
- APK e SHA-256:
- Aparelho:
- Versão Android:
- WebView:
- Data:

## C1 — Interface e formatos
- [ ] Importar GLB, glTF, OBJ, FBX, STL e BBModel pelo botão Importar modelo 3D existente.
- [ ] Importar Nyra Scene Project v1 válido.
- [ ] Rejeitar JSON inválido/versão desconhecida sem substituir a cena anterior.
- [ ] Importar Character+Voxel v4 e conferir as seis partes estruturais; confirmar aviso/limite se voxels e objects estiverem vazios.
- [ ] Exportar JSON, reimportar e comparar hierarquia, transforms, geometria, UVs, normais, grupos e materiais básicos.
- [ ] Confirmar que JSON Scene Project v1 não promete incorporar payload binário de texturas.
- [ ] Confirmar botões GLB, OBJ, STL, BBModel, JSON e Diagnóstico habilitados após importação normal.
- [ ] Confirmar arquivos auxiliares e comportamento do seletor principal.

## C2 — Guia
- [ ] Percorrer as 23 etapas usando anterior/próximo e seleção numérica.
- [ ] Conferir alvos e destaques nos três editores.
- [ ] Testar fechar por botão, Esc e toque fora.
- [ ] Testar com WebGL indisponível; texto e navegação precisam continuar funcionais.

## C3 — Robô oficial
- [ ] Confirmar leitura de assets/www/nyra_personagem.json dentro do APK.
- [ ] Conferir cores, seis partes, posição, rotação, escala e visibilidade.
- [ ] Testar falha de fetch ou WebGL e confirmar fallback 2D.
- [ ] Abrir/fechar o guia repetidamente e observar uso de CPU/GPU e contexts.

## C4 — Desempenho e benchmark
- [ ] Escolher o mesmo modelo pesado de referência, incluindo o caso observado próximo de 25 MB quando disponível.
- [ ] Registrar tamanho, vértices, triângulos, malhas, materiais, texturas e aparelho.
- [ ] Fazer uma execução de aquecimento e depois cinco execuções medidas.
- [ ] Guardar nyra-performance-report.json em cada execução.
- [ ] Confirmar eventos `json_read`, `json_parse`/parse por formato, `scene_build_and_commit` e duração total no relatório.
- [ ] Comparar mediana e P95 de leitura, parse, duração total e frame time no mesmo aparelho/arquivo.
- [ ] Registrar travamentos, ANRs, erros WebView e memória quando disponível.
- [ ] Só aceitar otimização se houver melhora mensurada sem degradação visual silenciosa.

## C5 — Cache e robustez Android
- [ ] Consultar Estado do cache temporário e confirmar limite agregado de 512 MiB e retenção de 7 dias.
- [ ] Exportar um arquivo e confirmar que o temporário fica no diretório Nyra separado.
- [ ] Abrir exportação/seletor e tentar limpar: a limpeza deve ser bloqueada enquanto houver operação ativa.
- [ ] Fechar operações, limpar temporários e confirmar que projetos/rascunhos continuam intactos.
- [ ] Confirmar bloqueio do limite agregado durante uma exportação que exceda o orçamento, sem deixar temporário parcial órfão.
- [ ] Confirmar que temporários abandonados com mais de 7 dias são removidos e arquivos ativos não são removidos.
- [ ] Testar seleção via ACTION_OPEN_DOCUMENT, URIs e ClipData com múltiplos auxiliares.
- [ ] Testar ACTION_CREATE_DOCUMENT, cancelamento e retomada.
- [ ] Girar tela e retomar app durante e após importação.
- [ ] Testar pressão de memória e cold start.

## Resultado
- [ ] Aprovado — todos os itens essenciais passaram.
- [ ] Reprovado — registrar logs, arquivo, aparelho e passos para reproduzir.

**Limites a preservar:** o cache gerenciável desta etapa cobre apenas temporários de exportação; não equivale a armazenamento de projetos. A limpeza não pode remover projetos persistentes.
