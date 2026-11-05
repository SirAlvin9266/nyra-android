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

## Estado de fechamento em 2026-11-03

**Resultado: implementação funcional e auditorias automatizadas aprovadas; para o planejamento atual, a Frente A está considerada concluída no escopo interno do aplicativo.** A confirmação externa do round-trip Blockbench e dos fluxos Android permanece como validação de release/regressão, não como bloqueio para iniciar B ou C. Não declarar compatibilidade universal além dos formatos e casos cobertos.

Evidências verificadas na branch `work/bbmodel-export-and-large-model-performance`, commit `e8fe035559eabcc3b64c20115a10050840f910f3`:
- CI #349 concluiu com sucesso: auditorias do editor e adaptadores, DSL, importador Blockbench, pré-validação GLB, build debug APK e verificação de assets offline.
- O importador tem testes com o fixture real do escudo `spartan_shild_editavel.bbmodel` (898 faces, uma textura, sem warnings), fixture `chinese.bbmodel` (67 elementos, formato Hytale prop, atlas embutido), além de fixtures sintéticas para malha livre, grupos vazios, metadados desconhecidos, UUIDs duplicados, referências de vértices inválidas, texturas ambíguas e elementos não suportados.
- O script de auditoria também referencia `kintsugi.bbmodel`, mas o conteúdo do arquivo não pôde ser recuperado nesta verificação; não registrar seu inventário como validado aqui.
- O seletor principal aceita GLB, glTF, OBJ, FBX, STL, BBModel e JSON Nyra, com seleção de arquivos auxiliares.
- O editor contém construção de documento BBModel a partir da cena atual, validação estrutural, reimportação interna e relatório de compatibilidade. Isso é round-trip interno, não prova de compatibilidade no Blockbench externo.
- O painel de inspeção de nove visões está no HTML atual da branch. O commit mais recente declara correção da escala de UVs para pixels Blockbench e cálculo de UV islands; a semântica e a apresentação ainda precisam de validação visual no aplicativo.
- O PR #6, que continha uma primeira implementação separada de mapeamentos, foi fechado sem merge por problemas de serialização HTML. Não contabilizar seu conteúdo como integrado; usar somente a implementação presente no PR #5.

### A1. Auditoria e preservação da importação Blockbench
- **Base automatizada forte; cobertura de fixtures reais parcial.**
- Confirmado por teste: cubos e malhas livres, triangulação, grupos de materiais, metadados e documento de origem, grupos vazios, warnings de dependências, rejeição de UUID duplicados e referências inválidas, elementos não suportados preservados no documento bruto.
- Confirmado por fixture real no script: escudo Spartan (mesh) e cadeira chinesa/Hytale (cubos e atlas).
- **Pós-validação / expansão de cobertura:** executar fixtures adicionais de projeto Bedrock e modelos com combinações reais de bones/animações/texturas externas; abrir e inspecionar visualmente resultados no Blockbench.
- **Pós-validação:** recuperar/verificar o inventário do fixture Kintsugi e registrar contagens completas.

### A2. Unificar o seletor de importação
- **Implementado no código e coberto pela auditoria do editor; validação Android física pendente.**
- Formatos declarados: `.bbmodel`, JSON de projeto Nyra, GLB, glTF, OBJ, FBX e STL; arquivos auxiliares múltiplos.
- A seleção exige um arquivo principal de modelo por vez.
- **Validação de release:** confirmar seletor Android, URIs, ClipData, permissões e múltiplos arquivos auxiliares em aparelho físico.

### A3. Converter para BBModel
- **Implementação presente; compatibilidade externa não certificada.**
- A conversão constrói o documento usando a cena atual, incluindo malhas, grupos, UUIDs, transforms, UVs e texturas nos casos suportados.
- Há validação estrutural e relatório de itens não suportados.
- Limites conhecidos: escalas não uniformes podem ser recusadas; transformações de malha são incorporadas aos vértices; pivôs individuais podem não permanecer como objetos editáveis separados; interpolações avançadas, múltiplos data points e metadados desconhecidos de animação não são preservados integralmente.
- **Validação de release:** confrontar o resultado no Blockbench real e corrigir eventuais diferenças.

### A4. Exportar modelos editados
- **Implementação presente; fluxo externo pendente.**
- O controle `Exportar BBModel editado` gera arquivo a partir da cena editada; a validação/reimportação interna ocorre antes de salvar.
- GLB, OBJ e STL permanecem como exportadores separados; exportação de personagem JSON é fluxo distinto.
- **Validação de release:** verificar conteúdo, nomes, grupos, pivôs, transforms, UVs, atlas/texturas e animações após abrir o arquivo no Blockbench.

### A5. Teste round-trip e fixtures
- **Round-trip interno coberto; round-trip externo não executado.**
- Já existe: construir BBModel → validar estrutura → reimportar no próprio Nyra → contar malhas, UV meshes e grupos.
- **Validação externa complementar:** importar arquivo real → inventariar → editar de forma identificável → exportar → abrir no Blockbench → comparar origem e saída.
- Fixtures mínimas de validação externa: escudo mesh e um projeto de cubos/Bedrock com textura; incluir Kintsugi quando o fixture estiver acessível.
- Comparar nomes, contagens, topologia, UUIDs, grupos, pivôs, transforms, UVs, texturas, materiais e clips.

### A6. Mapeamentos e diagnóstico de compatibilidade
- **Painel implementado no PR #5; validação funcional/visual pendente.**
- Nove visões no painel: hierarquia, metadados, geometria/topologia, UV, materiais/texturas, transforms/pivôs, rig/animação, dependências e compatibilidade.
- Código atual calcula dados de inspeção e UV islands; commit final corrige escala de UV para pixels Blockbench.
- **Validação visual complementar:** abrir no aplicativo e confirmar que cada visão apresenta dados coerentes nos fixtures reais, inclusive UV islands, pivôs, animações e dependências externas.
- Os mapas são diagnósticos, não ferramentas de edição topológica.

### Checklist de encerramento restante
- [x] O CI #349 executou o teste do fixture Kintsugi: a etapa `audit_bbmodel_import.cjs` terminou com PASS. O inventário completo do arquivo ainda não foi recuperado nesta revisão.
- [ ] (Release) Executar round-trip externo de escudo mesh e projeto de cubos/Bedrock no Blockbench.
- [ ] (Release) Conferir visualmente UVs/atlas, grupos, pivôs, transforms, texturas e animações exportadas.
- [ ] (Release) Validar as nove visões de inspeção no Nyra com fixtures reais.
- [ ] (Release) Testar importação/exportação pelo seletor Android/WebView em aparelho físico.
- [ ] (Release) Registrar versão do Blockbench, aparelho/Android, arquivos usados, resultados e limitações.
- [x] CI #349 verde e APK debug produzido com assets offline verificados.
- [ ] Somente após validação de release, considerar integração à main mediante decisão explícita.

**Política de integração preservada:** não mesclar automaticamente na `main` nesta etapa. CI verde é necessário, mas não substitui round-trip externo e teste físico Android.
 
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

### C1. Interface, importação e exportação de formatos
- **Correção de escopo:** preservar o botão funcional `Importar modelo 3D` e o seletor `nyraModelFiles`; não recriar nem substituir a lógica existente.
- O fluxo principal de importação deve aceitar modelos 3D já suportados e também modelos de personagem/projeto no formato JSON da Nyra. A importação JSON é requisito explícito, não apenas compatibilidade incidental.
- Adicionar/manter uma ação explícita de exportação de modelo/personagem JSON. Esse formato é importante para o gerador matemático e para o intercâmbio com o modelo de dados da Nyra.
- Diferenciar JSON de personagem/projeto Nyra de JSON genérico: validar versão/esquema e estrutura antes de carregar; rejeitar ou explicar arquivos incompatíveis sem corromper a cena atual.
- Manter os exportadores GLB, OBJ, STL e BBModel; organizar o BBModel junto aos formatos 3D e preservar a ação JSON claramente identificada.
- Remover somente eventual botão de importação antigo/obsoleto, sem remover funcionalidades do seletor atual.
- Revisar visualmente organização e acessibilidade no Android na validação integrada; não inventar requisitos de interface não confirmados.
- A capacidade atual do gerador matemático para personagens complexos não é considerada resolvida pela existência de importação/exportação JSON. Avaliação de qualidade do gerador foi movida para a Frente V.

### C2. Guia interativo específico e contextual
- **Implementado na branch:** 23 etapas detalhadas, com explicações conceituais, operação, resultado esperado, limites, estados e alvos de interface. Validação de alvos WebView fica para o teste final.
- Diferenciar objeto, grupo, malha, vértice, aresta, face e superfície.
- Ensinar primitivas, perfis e superfícies; subdividir e selecionar elementos.
- Ensinar movimentação/deformação local, extrusão, loft, espessura, camadas e pregas quando implementados.
- Explicar mapeamentos e inspeção de geometria, UV, materiais, pivôs e animações.
- Importação `.bbmodel` e JSON Nyra pelo botão funcional atual `Importar modelo 3D`, arquivos auxiliares e resolução de texturas.
- Diferenciar Converter para BBModel de Exportar.
- Explicar perdas/limitações de GLB, OBJ, STL e BBModel.
- Incluir salvamento, backup, undo/redo e operações destrutivas.
- Cada passo deve indicar estado: Disponível, Em desenvolvimento ou Planejado.
- Não destacar controles inexistentes; destacar o controle real quando disponível.
- Guia não deve ensinar uma função futura como se ela já estivesse no app.

### C3. Robô-guia oficial
- **Implementado na branch:** canvas do guia renderiza um robô 3D com Three.js a partir de `docs/sources/nyra_personagem.json`; usa cuboides proxy porque `voxels` e `objects` estão vazios. Texto e navegação continuam disponíveis se WebGL falhar.
- O arquivo enviado contém seis partes principais (`torso`, `head`, `armL`, `armR`, `legL`, `legR`), cores, posições, escalas, rotações e visibilidade. Os arrays `voxels` e `objects` estão vazios; portanto, é uma especificação estrutural, não uma malha 3D pronta.
- A base é Character+Voxel v4, com seis partes principais, cores e transforms, mas `voxels` e `objects` vazios.
- Construir o visual oficial a partir dessa base; não confundir o arquivo estrutural com um personagem finalizado.
- Manter o guia operável mesmo se o modelo 3D do robô falhar; fallback e erros isolados.

### C4. Performance de modelos grandes
- **Instrumentação adicionada ao editor:** eventos de seleção/importação, duração total do carregamento, contagem de malhas, vértices, triângulos, grupos, ossos, materiais e texturas; métricas do renderer (draw calls, geometrias e texturas); amostras de frame time, detecção de long tasks e memória JS quando exposta pelo WebView. O botão `Diagnóstico de desempenho` exporta `nyra-performance-report.json`.
- **Problema reproduzível relatado pelo usuário:** travamentos ao importar pacotes pesados, incluindo um pacote em torno de 25 MB. O tamanho do arquivo é uma referência do caso observado, não um limite técnico fixo.
- Investigar separadamente tempo de leitura, descompressão, parse, construção de cena, texturas, geometria, consumo de memória e renderização; identificar a etapa que trava antes de escolher a otimização.
- Comparar o mesmo arquivo no mesmo aparelho antes/depois; benchmark físico fica reservado ao teste final do usuário.
- Instrumentar leitura, parse, construção de cena, vértices, triângulos, materiais, texturas, draw calls e frame time.
- Medir memória se WebView/Android permitir.
- Pixel ratio adaptativo e qualidade escolhível, sem downgrade silencioso.
- Renderização sob demanda quando possível.
- Compartilhar geometria/material, instancing e merge apenas quando não alterarem semântica/seleção.
- Descartar buffers, texturas e URLs quando não utilizados.
- Feedback de progresso, cancelamento e limites explícitos para importações grandes.

### C5. Robustez Android, cache local e regressões
- **Parcial em código / ensaio físico reservado para o fechamento:** o host trata `ClipData` e URI múltiplos, tenta persistir permissões e exporta via `ACTION_CREATE_DOCUMENT`; CI executa auditorias, build e verificação de assets offline. Instalação, seleção real, retomada, rotação e pressão de memória serão validadas pelo usuário no teste integrado final. Inicialização eager foi restaurada e confirmada pelo usuário em APK anterior.
- Implementar uma estratégia explícita de **cache local gerenciável** para dados derivados e temporários dos projetos, como cópias de trabalho, previews, thumbnails, geometrias processadas e recursos reconstruíveis. O objetivo é evitar crescimento descontrolado do armazenamento do aparelho e permitir limpeza do cache.
- A limpeza do cache deve liberar apenas dados temporários/reconstruíveis; não pode apagar silenciosamente os projetos que o usuário espera manter. Projetos e estado editável precisam de persistência local durável separada do cache, ou mecanismo equivalente de recuperação/salvamento. A interface deve distinguir claramente limpar cache de apagar projetos/dados.
- Verificar existência e integridade dos arquivos em cache antes de reutilizá-los, pois o Android pode removê-los quando precisar de espaço. A limpeza de cache não pode ser requisito para recuperar um projeto.
- Criar política de tamanho/retensão/limpeza para cache, com métricas de espaço utilizado e opção de limpeza pelo usuário; avaliar limpeza automática segura de temporários antigos sem tocar em projetos ativos.
- Preservar o carregamento funcional dos três editores e os assets offline.
- Testar seleção de múltiplos arquivos, URIs, ClipData, permissões e exportação via seletor Android.
- Verificar rotação de tela, retomada do app, falta de memória e erros de WebView.
- Automatizar sintaxe do host e dos módulos incorporados; validar serialização HTML antes de modificar o template.
- Rodar auditorias, build APK, verificação dos assets offline e testes de regressão em importação, geração, edição, salvamento, reabertura e exportação.
- Não mergear na main sem CI verde e ensaio Android real.

# Frente V — Avaliação e evolução do gerador automático de personagens via JSON

Objetivo: verificar se o gerador matemático/IA baseado no formato JSON da Nyra realmente produz personagens e objetos com qualidade, liberdade geométrica e complexidade compatíveis com o que o editor permite construir manualmente.

- **Problema observado pelo usuário:** personagens e outros objetos produzidos pelo gerador atual parecem muito limitados; em vários casos, a construção manual no editor permite resultados consideravelmente melhores.
- Não considerar o gerador satisfatório apenas porque produz um JSON válido ou porque consegue montar um personagem básico. A qualidade visual, a expressividade, a complexidade e a editabilidade do resultado precisam ser avaliadas.
- Criar uma bateria comparativa de casos: personagem humanoide simples, personagem estilizado, personagem com proporções não convencionais, personagem com acessórios/roupas/camadas, criatura ou modelo inspirado em Minecraft e objetos não humanoides.
- Para cada caso, comparar: resultado manual de referência, resultado gerado, variedade de formas, proporções, detalhes, hierarquia/peças, materiais/cores, capacidade de edição posterior e fidelidade ao pedido.
- Auditar os limites do esquema JSON atual e do gerador matemático: primitivas disponíveis, parâmetros, composição, transforms, hierarquia, superfícies, peças, materiais, UVs e recursos. Distinguir limitações do formato JSON das limitações do algoritmo que escreve esse JSON e das limitações do motor que o interpreta.
- Avaliar em que ponto a assistência de IA ajuda de fato e em que ponto restringe a criação a combinações repetitivas ou simplificadas.
- Investigar personagens complexos, incluindo modelos Minecraft: granularidade de peças, blocos, volumes, texturas/UVs e hierarquia. Não assumir suporte completo antes de validar exemplos reais.
- Definir melhorias a partir dos resultados comparativos; não ampliar o esquema ou reescrever o gerador por suposição antes de identificar os gargalos.
- Exportar e reimportar JSON deve preservar o conteúdo gerado e permitir continuidade de edição.
- Esta frente deve ser tratada como avaliação de qualidade e capacidade do gerador, não como simples pendência de importação/exportação da Frente C1.


## Prioridade definida pelo usuário

A Frente A permanece com as pendências externas documentadas; não declarar conclusão sem validação real. Em 2026-11-04, o usuário autorizou antecipar a **Frente C completa** antes da Frente B, por considerá-la mais rápida e por querer priorizar experiência de uso e robô-guia. Após concluir C, retomar a **Frente B completa**. Nenhuma pendência da A ou B deve ser descartada.

O trabalho deve ser organizado em **blocos de melhorias relacionadas**, não em pequenas tarefas isoladas sem contexto.

## Ordem de execução em blocos

### Frente A — concluir antes de iniciar a Frente B
1. **Bloco A1 — auditoria e preservação da importação:** fixtures reais (escudo mesh, cubos, Bedrock e projetos com UV/textura/animação); inventariar dados e perdas; corrigir o que o inventário demonstrar estar faltando.
2. **Bloco A2 — importação unificada:** integrar .bbmodel e .json ao seletor principal e preservar os outros formatos compatíveis; remover o botão duplicado sem perder compatibilidade.
3. **Bloco A3 + A4 — conversão e exportação BBModel:** converter a cena editada, não o original; estruturar corretamente hierarquia, UUIDs, pivôs, transforms, UVs, faces, texturas, materiais e animações quando suportados; separar converter de salvar/exportar.
4. **Bloco A5 — round-trip real:** importar → inventariar → editar → converter/exportar → abrir no Blockbench → comparar os dados de entrada e saída; não considerar sucesso apenas porque o arquivo foi gravado.
5. **Bloco A6 — mapas de inspeção:** hierarquia/outliner; componentes/metadados; geometria/topologia; UV; materiais/texturas; transformações espaciais; rig/animação; dependências/recursos; compatibilidade e perdas de conversão.
6. **Fechamento da Frente A:** executar testes com todas as fixtures, documentar capacidades e perdas por formato, corrigir regressões e obter CI verde antes de iniciar o desenvolvimento amplo do motor geométrico.

### Frente B — próxima grande etapa de desenvolvimento após a Frente C
1. **Bloco B1 — primitivas paramétricas:** validar o tubo oco e revisar os parâmetros das formas base.
2. **Bloco B2 + B3 — topologia e seleção localizada:** vértices, arestas, faces, seleção por região, transformações locais/globais e validação/reparo básico de malha.
3. **Bloco B5 — superfícies e deformação:** começar por uma placa subdividida com pontos de controle para mover extremidades e pontos internos, formando arcos, concavidades e ondulações.
4. **Bloco B6 — perfis, extrusão, loft e espessura:** gerar superfícies e volumes a partir de contornos e seções.
5. **Bloco B7 — roupas e tecidos manuais:** peças, camadas, pregas, dobras, mangas, saias, capas, aventais e babados, com UVs e materiais.
6. **Bloco B4 — operações de malha avançadas:** separar, cortar, preencher, soldar, subdividir, simetria e booleanas com reparo topológico. Booleanas robustas vêm após a base de topologia.
7. **Bloco B8 — DSL/gerador paramétrico:** descrever e testar recursos já existentes no motor, com versionamento e compatibilidade retroativa.
8. **Fechamento da Frente B:** validar edição, undo/redo, geometria, UVs, materiais e exportação das malhas resultantes.

### Frente C — pacote de experiência/Android a executar antes da Frente B por decisão do usuário em 2026-11-04
1. **Bloco C1 — acabamento da interface:** preservar o seletor `Importar modelo 3D` já funcional e remover apenas o botão antigo obsoleto; organizar exportação, acessibilidade e layout móvel.
2. **Bloco C2 — guia contextual:** atualizar o guia com instruções precisas, estados honestos e alvos reais; o passo de importação aponta para o seletor existente.
3. **Bloco C3 — robô-guia oficial:** completar o personagem baseado em `nyra_personagem.json` e manter um fallback se a renderização falhar.
4. **Bloco C4 — desempenho de modelos grandes:** instrumentar e comparar o mesmo arquivo no mesmo dispositivo; otimizar parse, geometria, materiais, texturas, draw calls, memória e renderização sem degradar silenciosamente.
5. **Bloco C5 — robustez e validação Android:** regressões, URIs/arquivos, armazenamento, rotação/retomada, assets offline, build e ensaio físico.
6. **Fechamento da Frente C:** validar o fluxo integrado, documentar limites e só então propor integração à main.

### Dependências transversais
- Manter CI e verificações básicas funcionando durante todas as frentes; isso é uma condição de segurança do desenvolvimento, não uma mudança de prioridade para a Frente C.
- Se uma dependência crítica de Android, teste ou estrutura de dados bloquear a Frente A, resolver apenas o necessário para desbloquear o bloco atual e depois retomar a ordem A → B → C.
- Não declarar nenhuma frente concluída sem testes reproduzíveis e evidência do comportamento real.
- A main continua protegida; nenhum merge é autorizado por esta ordem de planejamento.

## Critérios gerais de conclusão
- Cada recurso tem estado explícito e teste reproduzível.
- Importar/exportar valida o estado editado, não apenas o arquivo original.
- Malhas devem ter topologia/normais válidas; UV/material/textura e hierarquia são inspecionáveis.
- Undo/redo protege operações destrutivas.
- O guia só ensina funções disponíveis ou marca claramente os planos.
- Benchmark mede o mesmo arquivo no mesmo aparelho.
- APK só é distribuído após CI verde, assets offline verificados e teste físico.
- A main permanece protegida até validação e decisão explícita de integração.
