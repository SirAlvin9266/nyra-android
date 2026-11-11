# Nyra 3D Studio — Plano técnico detalhado da Frente D
## Integração de modelos Bedrock, importação, animação e exportação

**Prioridade:** executar a Frente D antes da Frente B.  
**Escopo:** área RoboTV/Animação e integração com o Criador de Personagens, com foco principal em modelos de entidade do Minecraft Bedrock criados no Blockbench.  
**Estado:** planejamento. Este documento não declara nenhuma etapa abaixo como implementada ou validada.

---

## 0. Princípios que não podem ser quebrados

1. Não confundir o projeto editável Blockbench (.bbmodel) com os arquivos de runtime do Minecraft Bedrock.
2. Não converter um modelo em geometria estática quando houver hierarquia, pivôs, ossos ou animações que possam ser preservados.
3. Não descartar silenciosamente dados não suportados. Avisar o que foi preservado, convertido, ignorado ou não pôde ser interpretado.
4. Nunca destruir o modelo atual se uma importação falhar. Preparar e validar o candidato antes de substituir a cena.
5. Separar o documento interno editável da Nyra do formato de exportação escolhido.
6. Não prometer que qualquer GLB, OBJ, FBX ou .bbmodel genérico será utilizável no Minecraft. O destino Bedrock exige estrutura e arquivos compatíveis.
7. Testes estáticos e CI não substituem abrir o pacote no Minecraft Bedrock e verificar o resultado real.
8. Toda conversão precisa ter relatório de perdas e avisos.
9. Manter compatibilidade com o fluxo atual do Criador de Personagens, mas não depender de duplicar seu código ou estado.
10. A implementação deve respeitar as versões de formato e recursos efetivamente suportados pela versão-alvo do Minecraft.

## 1. Entender e classificar o modelo de origem

### 1.1 Identificar o formato real do projeto
Ao selecionar um arquivo, ler o conteúdo e identificar:
- extensão e assinatura/conteúdo real;
- versão do formato Blockbench;
- `model_format` e metadados de projeto;
- se é Bedrock Entity, Bedrock Legacy, Bedrock Block, Generic Model, Hytale ou outro formato;
- existência de elementos cube, mesh, grupos/outliner, texturas, animações, locators e metadados;
- dimensões de textura e tipo de UV;
- existência de dependências externas.

A extensão .bbmodel não basta para determinar o destino. Um .bbmodel é o formato de projeto interno do Blockbench e pode representar formatos de projeto diferentes. A Nyra deve usar os metadados internos para decidir o adaptador.

### 1.2 Criar uma ficha de diagnóstico antes da importação
Mostrar:
- formato detectado e versão;
- quantidade de grupos, ossos, cubos e malhas;
- quantidade de texturas e resolução;
- quantidade de animações e canais;
- presença de pivôs, pais, locators e hierarquia;
- arquivos externos ausentes;
- recursos incompatíveis com o destino selecionado;
- estimativa de memória e complexidade.

A ficha deve permitir cancelar sem alterar a cena.

### 1.3 Distinguir destinos
Criar destinos explícitos:
- **Projeto Blockbench/Nyra:** preservar o máximo de dados editáveis do .bbmodel.
- **Minecraft Bedrock — entidade/personagem:** gerar geometria Bedrock, textura, animações e arquivos de ligação do Resource Pack; Behavior Pack apenas quando o fluxo realmente exigir comportamento.
- **Minecraft Bedrock — bloco/item/attachable:** tratar como destinos diferentes, com regras e estruturas próprias; não assumir que o exportador de entidade serve para eles.
- **Modelo 3D genérico:** GLB/glTF/OBJ/FBX/STL conforme as capacidades de cada formato.

A interface deve pedir o destino de exportação, ou inferi-lo com confirmação explícita quando o projeto já tiver formato Bedrock identificado.

---

## 2. Arquitetura interna: documento canônico da Nyra

Antes de ampliar os exportadores, consolidar uma representação interna independente do formato de origem.

### 2.1 Estrutura de dados
O documento deve conter, no mínimo:
- identificação do projeto, versão e formato de origem;
- unidades, orientação de eixos e convenção de coordenadas;
- árvore hierárquica de nós;
- identificador estável para cada nó;
- nome, tipo, pai e filhos;
- transformação local e global;
- origem geométrica separada do pivô de transformação;
- pivô, rotação inicial e escala;
- geometria: cubos, malhas, vértices, faces, normais e índices;
- UV por face/face-corner, sem forçar um único UV por vértice quando isso perder costuras;
- materiais, cores, transparência e referências de textura;
- imagens incorporadas e dependências externas;
- ossos, relações de parentesco, locators e bindings;
- clips de animação, canais, keyframes, interpolação, loop, duração e metadados;
- metadados específicos do formato de origem que ainda não tenham representação genérica.

### 2.2 Preservação de dados específicos
Manter um bloco de metadados de origem para propriedades específicas do Blockbench/Bedrock que a Nyra ainda não edite. Isso evita perder dados apenas porque a interface ainda não oferece controle sobre eles.

### 2.3 IDs e nomes
- IDs internos estáveis não devem depender do nome visível.
- Nomes de ossos usados por animações precisam ser preservados exatamente, respeitando as regras do Bedrock.
- Renomear um osso deve atualizar todas as referências internas e oferecer verificação de colisões.
- Não remover grupos vazios se tiverem função de pivô ou hierarquia.

### 2.4 Transformações e eixos
Criar adaptadores explícitos para converter:
- eixos e handedness;
- unidades e escala;
- ordem de rotação;
- pivôs e transformações locais;
- origem do objeto versus pivô de rotação.

Não aplicar inversões de eixo em vários pontos do pipeline. A conversão deve ocorrer uma única vez no adaptador de entrada ou saída, com testes de ida e volta.

---

## 3. Importação Blockbench (.bbmodel)

### 3.1 Pipeline seguro
1. Ler arquivo sem alterar a cena atual.
2. Fazer parse JSON e validar estrutura mínima.
3. Validar versão e model_format.
4. Criar relatório de diagnóstico.
5. Resolver imagens incorporadas e externas.
6. Construir árvore de grupos/ossos.
7. Construir geometria de cada elemento.
8. Converter UVs e materiais.
9. Importar pivôs, rotações e locators.
10. Importar clips e canais de animação.
11. Validar referências entre animações e ossos.
12. Construir cena temporária.
13. Enquadrar e pré-visualizar a cena temporária.
14. Só depois da aprovação, substituir o modelo ativo.
15. Manter opção de desfazer a importação.

### 3.2 Grupos e hierarquia
- Converter grupos/outliner em nós hierárquicos.
- Preservar ordem, nomes, pais e filhos.
- Preservar grupos sem geometria quando funcionarem como pivôs.
- Manter elementos filhos no referencial local correto.
- Detectar pais inexistentes, ciclos e nomes duplicados.
- Não achatar a hierarquia para uma única malha.

### 3.3 Cubos Bedrock
Preservar:
- origin, size, pivot, rotation;
- mirror e inflate;
- UV box e UV por face;
- associação do cubo ao osso/grupo;
- rotação do cubo em relação ao pivô.

Testar as seis faces, espelhamento, cubos rotacionados, cubos com UV por face e cubos com dimensões zero ou inválidas.

### 3.4 Malhas livres
- Importar vértices, faces, índices, normais e UVs.
- Triangular apenas para o renderizador interno se necessário, mantendo a topologia original no documento canônico.
- Preservar UVs por canto da face, materiais por face e grupos.
- Preservar transformação e associação ao osso.
- Identificar malhas não exportáveis para o alvo Bedrock escolhido.
- Não assumir que uma malha livre aceita pelo Blockbench será aceita pelo Minecraft.

**Ponto crítico:** a documentação Bedrock atual marca poly_mesh como recurso depreciado em versões modernas de geometria. Portanto, não se deve construir a exportação nova em cima dessa propriedade como se fosse uma solução universal. O exportador deve consultar o schema/versão-alvo, preferir a geometria suportada e emitir aviso ou bloquear a exportação quando a malha não tiver representação Bedrock segura. Não converter automaticamente uma malha complexa em centenas de cubos sem autorização, pois isso pode alterar aparência, desempenho, UV e animação.

### 3.5 Texturas externas e incorporadas
- Extrair imagens incorporadas sem recompressão desnecessária.
- Resolver caminhos relativos de arquivos externos.
- Permitir selecionar dependências ausentes.
- Não associar arquivos apenas por nome se houver ambiguidade.
- Preservar dimensões reais, transparência e formato quando possível.
- Informar se o material ou textura não pode ser representado no destino.

### 3.6 Resultado da importação
Exibir relatório:
- importado sem alterações;
- convertido com equivalência;
- convertido com perda;
- ignorado por incompatibilidade;
- dependência ausente;
- recurso que exige preparação manual.

---

## 4. Importação e preservação de animações

### 4.1 Dados que precisam ser lidos
Para cada clip:
- nome e identificador;
- duração e unidade temporal;
- loop e propriedades;
- canais por osso/nó;
- posição, rotação e escala;
- keyframes e seus tempos;
- valores e handles/interpolação quando existirem;
- expressões/Molang quando existirem;
- eventos, sons, partículas e metadados, se presentes;
- referências a ossos e nomes exatos.

### 4.2 Não misturar três sistemas diferentes
A Nyra deve distinguir:
1. animações Blockbench importadas;
2. animações internas criadas na Nyra;
3. animações Bedrock exportadas.

Elas podem compartilhar a mesma timeline visual, mas devem manter a origem e os recursos específicos. Dados Bedrock baseados em Molang não devem ser convertidos em keyframes falsos sem informar que a expressão foi perdida ou congelada.

### 4.3 Compatibilidade dos canais
- Mapear posição, rotação e escala para os canais internos.
- Preservar ordem, tempo, interpolação e loop.
- Converter graus/radianos e eixos de forma centralizada.
- Validar que cada canal aponta para osso/nó existente.
- Manter canais não compreendidos nos metadados de origem.
- Se não for possível reproduzir uma expressão Molang no preview da Nyra, mostrar que o canal foi preservado para exportação, mas não simulado fielmente.

### 4.4 Teste de integridade
Após importar:
- número de clips deve corresponder ao arquivo;
- número de canais e keyframes deve ser contabilizado;
- referências a ossos devem resolver;
- duração e loop devem ser preservados;
- nenhum clip deve ser descartado sem aviso.

---

## 5. Integração com RoboTV/Animação

### 5.1 Interface
Dentro da própria área de Animação, disponibilizar:
- Importar modelo;
- Importar animações;
- Exportar modelo;
- Exportar animações;
- Exportar pacote Bedrock;
- lista de clips;
- timeline;
- árvore de ossos/grupos;
- controles de reprodução e seleção.

Os botões de importação/exportação na área de Animação são requisito explícito. Não considerar suficiente deixar exportação apenas no rodapé geral do Criador de Personagens.

### 5.2 Estado compartilhado
- Definir um único documento/projeto ativo compartilhado pelos editores.
- RoboTV não deve criar uma cópia independente e divergente da hierarquia.
- Alterações na estrutura precisam atualizar a árvore e a timeline.
- Trocar de editor não pode descartar clips, seleção ou alterações não salvas.
- Usar rascunhos e salvamento automático já existentes, ampliando o esquema com migração de versão.

### 5.3 Árvore e timeline
- Selecionar um osso na árvore destaca o nó no viewport e seus canais na timeline.
- Selecionar um canal destaca o osso correspondente.
- Renomear/remover osso deve atualizar referências de animação com confirmação.
- Ocultar um osso na visualização não deve removê-lo do projeto/exportação.
- Permitir filtrar canais e clips em modelos grandes.

### 5.4 Reprodução
- Play, pause, stop e scrub.
- Campo de tempo atual e duração.
- Loop por clip.
- Reprodução de um clip ou sequência.
- Voltar à pose-base sem alterar keyframes.
- Evitar acumular transformações a cada frame: sempre avaliar a pose a partir da pose-base e dos canais no tempo atual.
- Garantir que pausar e retomar não altere a posição do modelo.

---

## 6. Edição e criação de animações

### 6.1 Animação por objeto/grupo
Para nós com transformação:
- selecionar objeto/grupo;
- inserir keyframe de posição, rotação e escala;
- editar tempo e valor;
- mover, duplicar e apagar keyframes;
- copiar/colar poses;
- preservar pivô e hierarquia;
- avisar quando a transformação de um pai afetar todos os filhos.

### 6.2 Animação por esqueleto
- Expor ossos e relações pai/filho.
- Permitir keyframes por osso.
- Preservar pose-base e pivôs.
- Permitir testar movimento de braços, pernas, asas, cabeça e acessórios.
- Não criar esqueleto artificial sem consentimento.
- Se o modelo não tiver ossos adequados, orientar preparação/rigging em vez de prometer animação esquelética.

### 6.3 Keyframes
- Tipos de canal: posição, rotação e escala.
- Tempo em segundos ou ticks, com conversão explícita para Bedrock.
- Interpolação suportada identificada por tipo.
- Não substituir curva por linear sem avisar.
- Permitir copiar, mover, duplicar e apagar keyframes.
- Evitar keyframes duplicados conflitantes no mesmo canal/tempo.

### 6.4 Preparação/rigging
Quando necessário:
- identificar peças que deveriam se mover juntas;
- permitir criar grupos/ossos e definir pivôs;
- atribuir partes a ossos;
- estabelecer pais;
- validar ciclos e referências;
- oferecer prévia antes de confirmar.
Não automatizar rigging de maneira destrutiva.

---

## 7. Exportação para Minecraft Bedrock

### 7.1 Exportação não é um único JSON
Para entidade/personagem, planejar um exportador de pacote que gere os arquivos necessários e referências consistentes. Dependendo do destino:
- geometria `.geo.json` em `models/entity/`;
- textura em `textures/entity/`;
- animações em `animations/`;
- controladores em `animation_controllers/`, quando usados;
- client entity em `entity/` para referenciar geometria, materiais, texturas, animações e render controllers;
- render controller quando necessário;
- `manifest.json` e estrutura de Resource Pack;
- Behavior Pack apenas se o tipo de entidade e o fluxo solicitado precisarem dele.

A Nyra deve distinguir exportar somente geometria de exportar um pacote pronto para integrar no Minecraft. O pacote completo exige referências cruzadas válidas.

### 7.2 Geometria Bedrock
- Gerar `format_version` compatível com a versão-alvo.
- Gerar identificador de geometria válido e único.
- Gerar description e dimensões de textura.
- Gerar bones em ordem e hierarquia válida.
- Gerar pivôs, rotações, pais e locators.
- Gerar cubos com origin/size/rotation/pivot e UVs.
- Tratar espelhamento e inflate.
- Tratar malhas somente quando o schema e o jogo-alvo suportarem o recurso de modo confiável.
- Calcular bounds visíveis.
- Validar nomes e referências.

### 7.3 Conversão de coordenadas
- Implementar conversor único de coordenadas Blockbench ↔ Bedrock.
- Testar inversão do eixo X, sinais de rotação e pivôs com modelos assimétricos.
- Testar rotação combinada, pais rotacionados e cubos com pivôs próprios.
- Fazer testes round-trip quando possível: importar → exportar → importar, comparando posições e orientação.
- Não confiar em inspeção visual de um único cubo simétrico, pois erros de eixo podem ficar ocultos.

### 7.4 Texturas e UV
- Copiar textura original sem alteração quando possível.
- Gerar dimensões declaradas iguais às dimensões reais.
- Preservar UV por face e espelhamento.
- Validar se cada UV está dentro dos limites esperados.
- Se for necessário atlas/texture packing, oferecer opção explícita e atualizar todos os UVs.
- Não redimensionar silenciosamente textura 32×32, 64×64 ou 128×128.
- Conferir transparência e pixels semitransparentes.

### 7.5 Exportação de animações Bedrock
- Gerar arquivo(s) `.animation.json` com versão compatível.
- Mapear clips e canais para nomes de ossos Bedrock.
- Converter tempos e rotações conforme o padrão Bedrock.
- Preservar loop e keyframes.
- Preservar expressões Molang quando suportadas.
- Sinalizar recursos que não possam ser convertidos.
- Não gerar controller automaticamente sem opção/definição de comportamento.

### 7.6 Ligações do client entity
- Gerar nomes curtos e identificadores consistentes.
- Referenciar geometry, textures, materials, animations e render controllers corretamente.
- Garantir que o nome curto de cada animação aponte para o identificador correto.
- Evitar sobrescrever arquivos existentes sem confirmação.
- Se integrar a um pack existente, fazer merge consciente e mostrar conflitos.

### 7.7 Validador pré-exportação
Bloquear exportação quando houver erros estruturais graves:
- osso com nome duplicado;
- parent inexistente;
- ciclo na hierarquia;
- animação referenciando osso inexistente;
- identificador inválido;
- textura ausente;
- JSON inválido;
- UV ou dimensões inválidas;
- versão incompatível com recurso utilizado.

Avisos não bloqueantes:
- metadados sem suporte;
- interpolação convertida;
- locator não suportado pelo destino;
- material simplificado;
- malha com conversão aproximada.

---

## 8. Exportação genérica e exportação do projeto Nyra

Manter opções distintas:
- **Salvar projeto Nyra:** preserva documento canônico, hierarquia, dados de origem e animações editáveis.
- **Exportar .bbmodel:** só oferecer se a Nyra conseguir produzir estrutura válida e compatível com a versão de Blockbench alvo.
- **Exportar Bedrock:** gerar geometria e arquivos associados do Resource Pack.
- **Exportar GLB/glTF:** para uso 3D geral, sem prometer equivalência com Bedrock.
- **Exportar OBJ/STL:** formatos que não preservam necessariamente ossos, hierarquia e animações; avisar claramente as perdas.

Não usar um único botão genérico que esconda perdas importantes. Os comandos podem ficar agrupados na área de Animação, mas o usuário precisa escolher o destino.

---

## 9. Casos de teste obrigatórios

### 9.1 Kintsugi — caso principal
O arquivo de referência conhecido contém 38 cubos, 24 grupos e 28 animações. Deve ser o caso de regressão principal para:
- importação de hierarquia;
- pivôs;
- quantidade e nomes de clips;
- canais e keyframes;
- reprodução;
- edição;
- exportação Bedrock;
- reimportação e comparação.

A meta é que as 28 animações sejam contabilizadas e disponibilizadas, não apenas que o modelo apareça.

### 9.2 Spartan shield
Usar `spartan_shild_editavel.bbmodel` para verificar malhas livres, UV, materiais e limitações de exportação Bedrock. Não presumir que por ser importável como malha na Nyra será automaticamente um modelo Bedrock válido.

### 9.3 Cadeira chinesa
Usar `chinese-armchair.bbmodel` para verificar o tratamento de formato Hytale/prop e demonstrar que a Nyra identifica corretamente um projeto que não é Bedrock Entity. Exigir escolha de conversão, se aplicável.

### 9.4 Modelos adicionais
Criar fixtures pequenas e controladas:
- cubo simples com UV box;
- cubos com UV por face;
- cubo rotacionado com pivô;
- hierarquia de três níveis;
- osso sem geometria usado como pivô;
- animação com posição/rotação/escala;
- clip em loop e clip sem loop;
- animação com Molang;
- textura externa ausente;
- nome de osso duplicado;
- pai inexistente e ciclo;
- malha com triângulos e UV por canto;
- projeto genérico sem ossos;
- projeto Bedrock sem animação.

### 9.5 Testes no jogo
- Instalar/importar Resource Pack no Minecraft Bedrock da versão-alvo.
- Verificar que o pack aparece e não apresenta erro de conteúdo.
- Verificar geometria, orientação, escala, textura, transparência e UV.
- Verificar clips e controladores.
- Confirmar comportamento dentro do jogo, não apenas no preview da Nyra.
- Registrar versão exata do Minecraft e do formato usado.

---

## 10. Interface e experiência do usuário

Na área RoboTV/Animação:
- painel de importação com escolha de modelo ou animações;
- diagnóstico antes de importar;
- lista de modelos e clips;
- árvore de ossos/grupos;
- timeline;
- viewport;
- painel de propriedades do canal/keyframe;
- painel de exportação com destinos claramente separados.

Mensagens devem explicar a consequência:
- “28 animações encontradas; 28 importadas.”
- “2 canais Molang preservados para exportação, mas não reproduzidos no preview.”
- “Esta malha não tem representação Bedrock segura no destino escolhido.”
- “O arquivo externo de textura não foi localizado.”
- “A exportação OBJ não preservará ossos nem animações.”

Evitar mensagens vagas como “sucesso” quando houve conversão parcial.

---

## 11. Organização técnica sugerida

Separar módulos para evitar um arquivo monolítico:
- detector e leitor de formatos;
- adaptador Blockbench;
- documento canônico;
- adaptador de geometria Bedrock;
- adaptador de animação Bedrock;
- resolver de texturas/dependências;
- validador de projeto;
- exportador de pacote;
- integração de timeline;
- testes e fixtures.

O adaptador de importação não deve escrever diretamente na timeline nem no viewport. Ele deve produzir o documento canônico; a interface consome esse documento. O exportador também lê o documento canônico, sem depender de elementos visuais do editor.

---

## 12. Ordem de execução da Frente D

### Etapa D1 — Auditoria do fluxo atual
- Mapear os caminhos de importação no Criador de Personagens e RoboTV.
- Identificar onde os clips Blockbench são atualmente lidos.
- Identificar por que a timeline não recebe ou não mantém todos os clips.
- Registrar o que já funciona, o que está duplicado e o que está pendente.
- Não reescrever o importador antes de entender os caminhos existentes.

**Entrega:** relatório técnico e diagrama do fluxo atual.

### Etapa D2 — Documento canônico e preservação
- Definir o modelo interno.
- Mapear grupos, ossos, cubos, malhas, pivôs, texturas e animações.
- Adicionar migração de versão e persistência.
- Garantir que alternar entre Criador de Personagens e RoboTV não perca dados.

**Entrega:** documento canônico persistente com teste de ida/volta.

### Etapa D3 — Importador Blockbench completo para o caso Bedrock
- Implementar detecção por model_format.
- Importar hierarquia, cubos, UVs, pivôs, texturas e clips.
- Gerar relatório de preservação/perdas.
- Validar com Kintsugi e fixtures.

**Entrega:** Kintsugi aparece na Nyra com sua estrutura e 28 clips contabilizados.

### Etapa D4 — Timeline e edição
- Conectar clips importados à RoboTV.
- Implementar seleção sincronizada árvore/timeline/viewport.
- Implementar reprodução sem acumular transformações.
- Permitir editar e criar keyframes.
- Testar animação por objeto/grupo e por osso.

**Entrega:** editar, reproduzir e salvar uma animação importada sem perder estrutura.

### Etapa D5 — Exportador Bedrock de geometria e animação
- Gerar geo.json e animation.json.
- Gerar referências do client entity.
- Tratar texturas e UV.
- Implementar validador por versão-alvo.
- Gerar pacote de Resource Pack.

**Entrega:** pacote Bedrock exportado e validado estruturalmente.

### Etapa D6 — Controladores e integração do pacote
- Permitir criar/editar controllers quando necessário.
- Associar clips a nomes curtos e estados.
- Não inventar lógica de comportamento.
- Fazer merge seguro com packs existentes.

**Entrega:** pacote com animações acionáveis no Minecraft, quando o fluxo solicitado exigir controllers.

### Etapa D7 — Testes reais e regressão
- Abrir o pacote no Minecraft Bedrock.
- Testar Kintsugi e demais casos.
- Comparar resultado com Blockbench.
- Corrigir e documentar diferenças.
- Adicionar os casos corrigidos ao CI.

**Entrega:** relatório de validação real, com versões, capturas e limitações conhecidas.

### Etapa D8 — Interface final
- Colocar botões de importar/exportar dentro da área de Animação.
- Organizar painel de clips, árvore e timeline.
- Exibir diagnósticos e relatórios.
- Validar em Android/WebView e desktop.

**Entrega:** fluxo completo acessível na própria área RoboTV/Animação.

---

## 13. Critérios para considerar a Frente D concluída

A Frente D só pode ser marcada como concluída quando:
1. Os comandos de importar e exportar estiverem na área de Animação.
2. O Kintsugi for importado com estrutura preservada e 28 animações contabilizadas.
3. Os clips importados aparecerem e puderem ser reproduzidos na timeline.
4. For possível editar uma animação importada e salvar o projeto.
5. A hierarquia, pivôs e nomes de ossos continuarem corretos.
6. A exportação Bedrock gerar arquivos coerentes e referências válidas.
7. O pacote for aberto e testado no Minecraft Bedrock da versão-alvo.
8. As perdas e incompatibilidades forem apresentadas claramente.
9. A importação falha não destruir o projeto anterior.
10. O fluxo for validado no Android/WebView e no ambiente desktop suportado.

CI verde é necessário, mas não suficiente.

---

## 14. Referências técnicas para manter junto do plano

- Blockbench — formato .bbmodel: https://blockbench.net/wiki/docs/bbmodel/
- Blockbench — modelagem e animação Bedrock: https://blockbench.net/wiki/guides/bedrock-modeling/
- Microsoft Learn — schemas Bedrock: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/schemasreference/schemaslist
- Microsoft Learn — geometry 1.21.0: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/visualreference/geometry.v1.21.0
- Microsoft Learn — geometry 1.26.40: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/visualreference/geometry.v1.26.40
- Microsoft Learn — animações: https://learn.microsoft.com/en-us/minecraft/creator/documents/animations/animationsoverview
- Microsoft Learn — animações versus controllers: https://learn.microsoft.com/en-us/minecraft/creator/documents/animationsvscontrollers
- Microsoft Learn — client entity: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/cliententitydocumentation/cliententitydocumentationintroduction

**Nota de compatibilidade:** schemas e recursos do Bedrock evoluem. Antes de implementar o exportador, fixar uma versão-alvo de Minecraft e validar cada campo contra o schema correspondente. A documentação atual marca poly_mesh como depreciado em versões modernas; portanto, malhas livres precisam de uma decisão explícita de compatibilidade e não podem ser tratadas como garantidamente portáveis.
