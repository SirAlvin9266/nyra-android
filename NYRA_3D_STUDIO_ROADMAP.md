# Nyra 3D Studio — Inventário consolidado de melhorias pendentes

Este documento reúne o trabalho ainda não concluído identificado nos PRs, comentários técnicos, DSL, interface e ideias recentes. É um plano de decisão e não uma declaração de recursos implementados.

## Como ler
- **Disponível:** existe uma implementação conhecida; pode ainda exigir validação.
- **Parcial/em desenvolvimento:** existe uma base, mas não cumpre o fluxo completo.
- **Planejado:** ideia registrada, sem implementação funcional confirmada.
- A ordem abaixo é uma proposta técnica para reduzir retrabalho. O usuário decidirá as prioridades finais.

## As três frentes relacionadas

# Frente A — Interoperabilidade de arquivos, Blockbench e integridade dos modelos

Objetivo: garantir que um modelo entre e saia do Nyra sem perder dados silenciosamente, e que os arquivos gerados abram corretamente nas ferramentas de destino.

### A1. Auditoria e preservação da importação Blockbench
- **Parcial/em desenvolvimento.** O importador já lê cubos, malhas, hierarquia e texturas em cenários suportados.
- Testar arquivos reais: modelo de escudo em malha livre, cubos, projetos Bedrock e modelos com grupos e animações.
- Criar inventário de origem por arquivo: elementos, tipos, UUIDs, nomes, grupos/outliner, parent, pivôs/origens, rotações, transforms, UV por face/vértice, texturas, atlas, materiais, animações, bones e recursos externos.
- Preservar caminhos de texturas; resolver arquivos auxiliares sem associar imagens ambíguas pelo nome.
- Tratar dados desconhecidos sem descartá-los silenciosamente; registrar o que foi preservado, convertido ou perdido.
- Validar formatos e versões de projeto suportadas, incluindo `.bbmodel` e JSON de projeto.

### A2. Unificar o seletor de importação
- **Planejado.** Remover o botão separado duplicado Importar modelo / projeto (.bbmodel, .json).
- Incorporar `.bbmodel` e `.json` ao fluxo principal Importar modelo 3D, mantendo GLB, glTF, OBJ, FBX, STL e arquivos auxiliares compatíveis.
- Testar seleção de múltiplos arquivos no Android, URIs, ClipData e permissões de leitura.

### A3. Converter para BBModel
- **Planejado.** Criar ação explícita Converter modelo para BBModel.
- Converter a representação atual do Nyra, incluindo as edições realizadas; não devolver apenas dados do arquivo original.
- Gerar estrutura nativa Blockbench: elementos cube e mesh quando viável, grupos/outliner, UUIDs, parent, pivôs, origens, rotações, transforms, UVs, faces, textura/atlas, materiais e animações.
- Separar conversão (construção do documento interno) de exportação (salvar arquivo).
- Mostrar relatório de compatibilidade e perdas antes de salvar.

### A4. Exportar modelos editados
- **Parcial/em desenvolvimento.** Exportadores GLB, OBJ e STL já existem; o `.bbmodel` editado não está concluído.
- Reposicionar Exportar .bbmodel editado junto às opções de exportação do editor 3D.
- Manter a exportação específica de personagem JSON separada.
- Garantir que exportação reflita a cena editada e não o arquivo importado original.
- Documentar suporte e perdas por formato; validar materiais, texturas, hierarquia e animações onde possível.

### A5. Teste round-trip e fixtures
- Importar arquivo real → comparar inventário → editar no Nyra → converter → exportar → abrir no Blockbench → comparar novamente.
- Fixtures mínimas: escudo mesh, modelo de cubos, projeto Bedrock e arquivo com textura/UV/animação.
- Verificar nomes, contagens, topologia, UUIDs, grupos, pivôs, transforms, UVs, texturas, materiais e clips.
- Não considerar concluído só porque salvou um arquivo ou o próprio Nyra o reimportou.

### A6. Mapeamentos e diagnóstico de compatibilidade
- **Parcial/em desenvolvimento.** Já existe árvore de componentes e contadores/diagnósticos de modelos; o painel experimental de mapas foi fechado sem merge por falha estrutural.
- Mapa de hierarquia/outliner e UUIDs.
- Mapa de componentes e metadados de origem.
- Mapa geométrico/topológico: vértices, arestas, faces, índices, normais, triângulos e bounds.
- Mapa UV: coordenadas, ilhas, faces e ligação com atlas/textura.
- Mapa de materiais/texturas: slots, canais, imagens, transparência e emissão.
- Mapa espacial: posições, rotações, escalas, transformações locais/mundiais, pivôs e origens.
- Mapa rig/animação: ossos, pesos, pivôs, clips, tracks, duração e articulações.
- Mapa de dependências/recursos: arquivos externos, buffers, imagens e referências ausentes.
- Mapa de compatibilidade/exportação: preservado, convertido, descartado e motivo.
- Separar mapas somente de leitura de ferramentas de edição real.

# Frente B — Motor geométrico, modelagem avançada e criação paramétrica

Objetivo: evoluir o Nyra de um editor centrado em primitivas para um ambiente em que seja possível construir e deformar superfícies e volumes complexos, mantendo geometria válida e exportável.

### B1. Base geométrica e primitivas
- **Parcial.** DSL atual tem group, box, sphere, cylinder, cone e tube oco.
- Validar visualmente o tubo no Android, incluindo raios interno/externo, altura, paredes, fundo/tampa, aberturas, bordas e normais.
- Adicionar parâmetros úteis de resolução/segmentos e limites seguros.
- Manter primitivas paramétricas editáveis até o usuário convertê-las para malha.

### B2. Representação topológica editável
- **Planejado.** Estruturar vértices, arestas, faces, loops, normais, índices, grupos, materiais e UVs.
- Separar malha base editável da triangulação de renderização/exportação quando tecnicamente viável.
- Criar operações robustas de seleção, transformação e validação topológica.
- Reparo para arestas abertas, faces degeneradas, auto-interseções e geometria não-manifold.

### B3. Seleção localizada
- Modos objeto, face, aresta e vértice.
- Seleção individual, múltipla, por região e por laço.
- Mover, girar e escalar seleção; orientação local/global; pivô de seleção.
- Ocultar, bloquear, isolar e inverter seleção.
- Seleção coerente com grupos, hierarquia e malhas importadas.

### B4. Operações de malha
- Apagar, extrair, separar e duplicar partes.
- Extrusão de faces/perfis.
- Cortar por plano e preencher contornos.
- Soldar vértices, subdividir arestas/faces, dissolver e reconstruir regiões.
- Espelhar/simetria.
- Undo/redo transacional para operações topológicas.
- Booleanas (união, diferença/subtração e interseção) somente depois da base topológica e de reparo; testar sólidos fechados e casos degenerados.

### B5. Superfícies por pontos de controle e deformação
- **Planejado.** Criar superfícies subdivididas com pontos de controle editáveis.
- Exemplo base: placa retangular com subdivisões; mover uma ponta numa direção, a outra ponta numa direção diferente e abaixar/elevar pontos no meio para formar arco, concavidade e ondulação.
- Permitir mover, girar, escalar, suavizar, achatar e elevar conjuntos locais de pontos.
- Ferramentas de curva, perfil e superfície orgânica.
- Controlar densidade de subdivisão, suavidade e preservação da forma base.
- Gerar normais coerentes, limites, UVs e malha exportável.

### B6. Perfis, extrusão, loft e sólidos derivados
- Criar/editar contornos e perfis 2D.
- Extrudar um contorno ao longo de eixo, vetor ou caminho.
- Loft: conectar seções de formatos/dimensões diferentes ao longo de percurso, controlar correspondência, torção e suavidade.
- Gerar espessura, casca, bordas e tampas.
- Converter superfícies em sólidos fechados quando solicitado.
- Ferramentas para tubos, alças, tiras, placas curvas e elementos de construção.

### B7. Tecido, roupa e camadas
- **Planejado.** Construção manual de superfícies flexíveis; não confundir com simulação física.
- Modelar painéis, saias, capas, aventais, mangas, babados, golas e pregas.
- Adicionar camadas, espessura, bordas, dobras e costuras.
- Permitir peças separadas, hierarquia, simetria, pivôs e animação.
- Garantir UVs/atlas, materiais, nomes e exportação Blockbench/GLB.
- Simulação física de tecido (gravidade, tensão e colisão) é projeto posterior, separado da modelagem manual.

### B8. DSL/gerador paramétrico
- **Parcial.** JSON v1 documentado e testado para primitivas e hierarquia; atualmente não aplica contratos futuros de material/texture/UV.
- Evoluir com versionamento e compatibilidade retroativa.
- Definir operações para profiles, curves, surfaces/controlPoints, subdivision, extrude, loft, thickness, layers e folds.
- Acrescentar material, texture IDs, UV explícitos, tags, metadata e pivotMode com validação real no interpretador antes de declarar suporte.
- Permitir geração de personagem modular e roupas em peças editáveis.
- Não enviar assets binários grandes no DSL; referenciar recursos.
- Testar documentos inválidos, limites, hierarquias, superfícies degeneradas e geometria resultante.

# Frente C — Experiência de uso, guia, desempenho e robustez Android

Objetivo: fazer as capacidades serem compreensíveis, utilizáveis no telefone e confiáveis em modelos pequenos e grandes.

### C1. Corrigir layout e ações duplicadas
- **Planejado.** Retirar o segundo botão de importação e consolidar `.bbmodel`/`.json` no seletor principal.
- Mover exportação `.bbmodel` para o grupo de exportação 3D perto de GLB/OBJ/STL.
- Deixar Exportar personagem JSON separado, pois é outro formato/fluxo.
- Conferir quebra de linha, acessibilidade, tamanho de toque e ordem visual no Android.

### C2. Guia interativo específico e contextual
- **Parcial.** O guia já foi ampliado em texto na branch, mas precisa validar seus alvos na WebView e cobrir cada função.
- Diferenciar objeto, grupo, malha, vértice, aresta, face e superfície.
- Ensinar primitivas, perfis e superfícies; subdividir e selecionar elementos.
- Ensinar movimentação/deformação local, extrusão, loft, espessura, camadas e pregas quando implementados.
- Explicar mapeamentos e inspeção de geometria, UV, materiais, pivôs e animações.
- Importação `.bbmodel`/`.json`, arquivos auxiliares e resolução de texturas.
- Diferenciar Converter para BBModel de Exportar.
- Explicar perdas/limitações de GLB, OBJ, STL e BBModel.
- Incluir salvamento, backup, undo/redo e operações destrutivas.
- Cada passo deve indicar estado: Disponível, Em desenvolvimento ou Planejado.
- Não destacar controles inexistentes; destacar o controle real quando disponível.
- Guia não deve ensinar uma função futura como se ela já estivesse no app.

### C3. Robô-guia oficial
- **Planejado.** Fonte de identidade: `nyra_personagem.json`.
- A base é Character+Voxel v4, com seis partes principais, cores e transforms, mas `voxels` e `objects` vazios.
- Construir o visual oficial a partir dessa base; não confundir o arquivo estrutural com um personagem finalizado.
- Manter o guia operável mesmo se o modelo 3D do robô falhar; fallback e erros isolados.

### C4. Performance de modelos grandes
- **Pendente/sem benchmark concluído.** Existe relato de modelo de aproximadamente 25 MB com lentidão no telefone.
- Instrumentar leitura, parse, construção de cena, vértices, triângulos, materiais, texturas, draw calls e frame time.
- Medir memória se WebView/Android permitir.
- Benchmark comparável no mesmo arquivo e dispositivo antes/depois.
- Pixel ratio adaptativo e qualidade escolhível, sem downgrade silencioso.
- Renderização sob demanda quando possível.
- Compartilhar geometria/material, instancing e merge apenas quando não alterarem semântica/seleção.
- Descartar buffers, texturas e URLs quando não utilizados.
- Feedback de progresso, cancelamento e limites explícitos para importações grandes.

### C5. Robustez Android, armazenamento e regressões
- **Parcial.** Inicialização eager foi restaurada e confirmada pelo usuário em APK anterior.
- Preservar o carregamento funcional dos três editores e os assets offline.
- Testar seleção de múltiplos arquivos, URIs, ClipData, permissões e exportação via seletor Android.
- Verificar rotação de tela, retomada do app, falta de memória e erros de WebView.
- Automatizar sintaxe do host e dos módulos incorporados; validar serialização HTML antes de modificar o template.
- Rodar auditorias, build APK, verificação dos assets offline e instalar/testar no dispositivo físico.
- Não mergear na main sem CI verde e ensaio Android real.

## Dependências técnicas e ordem sugerida

A ordem é uma proposta de execução para minimizar retrabalho, não uma prioridade imposta ao usuário.

1. **C3 + C5 — alicerce e segurança:** validar robô-guia como identidade/base, restaurar e testar fluxo Android, estabilizar serialização/CI e produzir referência reproduzível. Não iniciar grandes mudanças no motor antes de confiar no pipeline.
2. **A1 + A6 — inventário e mapa de origem:** medir o que o importador realmente carrega e explicitar lacunas. Isso define o contrato de dados que a modelagem e os exportadores precisam preservar.
3. **A2 + C1 — interface de importação/exportação:** limpar duplicações e organizar o fluxo, sem retirar compatibilidade.
4. **A3 + A4 + A5 — conversor BBModel real e round-trip:** entregar uma cadeia editada/importada que sobreviva ao Blockbench. Isso valida a representação antes de sobrecarregá-la com novas geometrias.
5. **B2 + B3 — topologia e seleção localizadas:** são a infraestrutura da modelagem avançada e devem preceder operações complexas.
6. **B1 — revisar e ampliar primitivas:** validar `tube` e completar opções paramétricas úteis.
7. **B5 — superfícies e pontos de controle:** implementar placa subdividida e deformação local como primeiro caso de uso observável.
8. **B6 — perfis, extrusão, loft e espessura:** derivam naturalmente da infraestrutura de superfícies.
9. **B7 — roupas e tecidos manuais:** montar peças e camadas sobre superfícies e loft.
10. **B4 — operações avançadas/booleanas:** corte, separação e reparo; booleanas robustas por último, pois dependem de topologia confiável.
11. **B8 — DSL ampliada:** refletir cada capacidade já definida no motor, com schema/versionamento e testes. Não implementar DSL antes da geometria correspondente.
12. **C2 — guia contextual por função pronta:** manter o guia atualizado por fase; adicionar instruções de cada ferramenta quando o respectivo controle existir.
13. **C4 — otimização iterativa:** estabelecer benchmark primeiro e repetir após topologia, superfícies e modelos grandes. Performance é transversal e deve ser medida ao longo do trabalho.
14. **Validação final integrada:** fixtures reais, round-trip, regressão Android, ensaio físico e documentação das perdas.

## Critérios gerais de conclusão
- Cada recurso tem estado explícito e teste reproduzível.
- Importar/exportar valida o estado editado, não apenas o arquivo original.
- Malhas devem ter topologia/normais válidas; UV/material/textura e hierarquia são inspecionáveis.
- Undo/redo protege operações destrutivas.
- O guia só ensina funções disponíveis ou marca claramente os planos.
- Benchmark mede o mesmo arquivo no mesmo aparelho.
- APK só é distribuído após CI verde, assets offline verificados e teste físico.
- A main permanece protegida até validação e decisão explícita de integração.
