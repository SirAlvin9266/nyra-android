# Nyra — parecer técnico sobre a Frente B e sua relação com a evolução do aplicativo

**Base documental:** inventário consolidado de melhorias pendentes registrado no PR #5; `NYRA_MODEL_DSL.md`; estado do código e estrutura da branch de recuperação; revisão arquitetural e auditoria ampla registradas no PR #16.
**Natureza:** parecer de arquitetura e sequência de trabalho. Não é implementação da Frente B nem autorização para alterar a Frente D.

## 1. Parecer executivo

A Frente B não é um conjunto de ferramentas extras. Ela representa uma mudança de categoria do produto: o Criador de Personagens deixa de ser principalmente um editor de objetos/grupos e primitivas Three.js e passa a exigir um sistema de modelagem geométrica com topologia editável, seleção de componentes, operações de malha, superfícies e construção paramétrica.

A preocupação do usuário faz sentido: tentar encaixar todos esses recursos no editor atual, adicionando botões e painéis ao redor da estrutura existente, tende a gerar mais acoplamento e uma interface progressivamente mais difícil de usar.

**Recomendação:** antes de implementar recursos avançados da Frente B, o Nyra deve passar por uma etapa de fundação do produto e arquitetura. Isso não significa reescrever o aplicativo inteiro. Significa preparar um núcleo de modelagem, um modelo de documento de projeto, um sistema de comandos/undo-redo, uma camada de interação e uma interface de trabalho capaz de crescer.

A Frente B deve ser executada em blocos verticais pequenos, cada um entregando uma capacidade completa, testável e utilizável, em vez de tentar implementar toda a topologia, todas as ferramentas e toda a UI de uma vez.

## 2. O que a Frente B realmente pede

### B1 — Primitivas paramétricas

É a parte mais próxima do sistema atual. O DSL v1 documentado aceita `group`, `box`, `sphere`, `cylinder` e `cone`, com transformações, pivôs e hierarquia. O inventário do PR #5 inclui também `tube` como parcial, sujeito a validação visual. A base do editor usa malhas Three.js.

Isso ainda é geometria de objeto: cada primitiva é criada como uma geometria/malha, não como um sólido com topologia editável compartilhada. A existência de vértices no `BufferGeometry` não equivale a um modelo B-rep ou half-edge editável.

### B2 — Representação topológica

Esta é a maior mudança de fundação. O plano pede vértices, arestas, faces, loops, normais, índices, grupos, materiais e UVs, além de validação e reparo de malhas. O sistema atual trabalha em grande parte com objetos e geometrias Three.js renderizáveis.

Um motor topológico precisa distinguir o documento editável da geometria de renderização. Precisa preservar identidade de vértices/arestas/faces, conectividade, orientação, regiões, atributos e mapeamento para buffers de renderização. Sem isso, operações locais tornam-se frágeis ou exigem reconstruções ad hoc.

### B3 — Seleção localizada

Seleção de objeto não resolve seleção de face, aresta e vértice. São modos distintos de seleção, hit-testing, destaque visual, transformação, pivô, seleção múltipla, laço/região, ocultar/isolar e regras de propagação pela hierarquia.

### B4 — Operações de malha

Extrusão, corte, preenchimento, soldagem, subdivisão, dissolução, separação, espelhamento e booleanas dependem diretamente da estrutura topológica. Implementá-las antes da representação e de transações confiáveis resultaria em várias rotinas que não compartilham invariantes.

Booleanas de malhas arbitrárias não devem ser a primeira entrega. Elas precisam de política para interseções coplanares, degenerações, sólidos abertos, auto-interseções, tolerâncias, orientação e reparo. Deve existir uma etapa posterior específica de robustez geométrica.

### B5/B6 — Superfícies, perfis, extrusão, loft e espessura

A placa subdividida com pontos de controle é um caso inicial bem delimitado, mas já pede estrutura de superfície e relação entre pontos de controle e malha resultante. Perfis, loft, espessura e superfícies orgânicas precisam de parâmetros, continuidade, limites, normais e UVs.

### B7 — Roupas e camadas

Modelagem manual de tecidos não deve ser confundida com simulação física. O primeiro objetivo é construir painéis e superfícies editáveis — capas, mangas, saias, pregas, babados — com espessura, camadas, costuras, UVs, materiais e possibilidade de edição/animação. A simulação é um sistema separado e muito mais complexo.

### B8 — DSL paramétrica

O DSL atual é uma linguagem declarativa de composição de primitivas e grupos. A evolução planejada o transforma em uma descrição de operações e construções geométricas. Isso exige versionamento, validação semântica, limites de custo e erros que apontem a etapa do processo, não apenas propriedades inválidas.

## 3. Onde a arquitetura atual entra em conflito com esse crescimento

Na base analisada, o shell concentra aproximadamente 206 KB em um HTML, com os três editores em Base64 e um adaptador que injeta ferramentas, persistência e integrações no documento do Criador. O Criador contém a cena Three.js, controles e ferramentas originais; o painel de I/O/DSL é adicionado pelo adaptador. Essa estrutura dificulta desenvolver uma grande nova área sem conhecer e manipular detalhes internos do documento.

Os pontos críticos para a Frente B são:

1. **Falta de fronteira explícita de domínio geométrico.** Cena Three.js, objeto importado, primitivas DSL, malha renderizável e futuro documento topológico ainda não estão separados como conceitos de arquitetura.
2. **Adaptador como injetor.** Painéis e scripts são montados como strings e acoplados a marcadores/funções existentes; isso é inadequado como base de longo prazo para ferramentas complexas.
3. **Interface sem estrutura de workspace expansível.** Acrescentar seleção de vértice/aresta/face, inspetor, operações, hierarquia, parâmetros e ferramentas de superfície sem reorganizar o espaço de trabalho aumentaria densidade e conflitos.
4. **Ausência de um sistema geral de comandos geométricos identificado na base lida.** As operações avançadas precisarão ser transacionais, reversíveis, serializáveis e testáveis.
5. **Persistência orientada a rascunhos diferentes.** Um documento editável complexo precisa de um formato de projeto versionado, capaz de preservar parâmetros, topologia, atributos, referências de recursos e histórico compatível.
6. **Interoperabilidade é uma restrição de arquitetura.** O resultado deve continuar exportável para GLB/OBJ/STL/BBModel nos limites de cada formato; topologia e atributos não podem desaparecer silenciosamente.

Esses pontos são evidência estrutural ou dependências lógicas do escopo; não significam que a aplicação atual esteja inutilizável.

## 4. Minha recomendação: separar o produto em três níveis

### Nível 1 — Workspace do aplicativo

Responsável por navegação, projetos, arquivos, preferências, notificações, guias, comandos globais e integração Android. Deve parecer um produto único e não uma coleção de HTMLs independentes.

### Nível 2 — Workspace do editor de personagens

Responsável por viewport e layout de modelagem: hierarquia/outliner, viewport, inspetor de propriedades, ferramentas, seleção e operações. Deve suportar layouts adaptáveis ao celular e telas maiores. No telefone, painéis podem virar gavetas/abas contextuais; em telas maiores, podem ficar lado a lado.

### Nível 3 — Núcleo geométrico

Responsável por documento de modelagem, primitivas paramétricas, malha topológica, geração de renderização, seleção, operações, validação, histórico undo/redo e adaptadores de formato.

**Ponto-chave:** a interface não deve ser dona da geometria. Os componentes visuais enviam comandos ao núcleo e exibem o resultado; o núcleo não manipula diretamente botões ou DOM.

## 5. Arquitetura-alvo sugerida

```text
Nyra Android host
  └─ WebView shell / app workspace
      ├─ shared design system
      ├─ project & asset service
      ├─ editor lifecycle / routing
      └─ Character Modeling Workspace
          ├─ Viewport & camera
          ├─ Outliner / hierarchy
          ├─ Tool shelf / context actions
          ├─ Inspector / parameters
          ├─ Selection & transform UI
          └─ Geometry Core
              ├─ Project document + schema migrations
              ├─ Parametric objects
              ├─ Topology model (vertices / edges / faces / loops)
              ├─ Render mesh builder (Three.js BufferGeometry)
              ├─ Picking / selection mapping
              ├─ Geometry commands
              ├─ Validation & repair
              ├─ Undo / redo transactions
              └─ Import/export adapters
```

Não é obrigatório criar todos esses pacotes agora. Esta é a separação de responsabilidades que permite crescer sem transformar cada ferramenta nova em mais um bloco de código injetado.

## 6. Escolha técnica: não reinventar um motor inteiro no primeiro passo

Há três caminhos possíveis:

### Caminho A — Three.js BufferGeometry com metadados próprios

Manter Three.js para renderização, criar estrutura topológica leve própria e mapear os elementos editáveis para os buffers. É mais simples de encaixar e dá controle ao Nyra, mas operações topológicas robustas ainda serão responsabilidade do projeto.

### Caminho B — Núcleo half-edge/topologia dedicado

Adotar uma representação half-edge ou equivalente para conectividade, regiões e operações. O Three.js fica como camada de renderização. Isso é a arquitetura mais coerente para edição localizada e operações de malha, porém aumenta bastante o custo e exige um núcleo bem testado.

### Caminho C — Biblioteca geométrica especializada

Integrar uma biblioteca madura para operações específicas (por exemplo, booleanas, tesselação ou reparo) atrás de uma interface interna. Isso pode reduzir trabalho matemático, mas acrescenta dependência, integração, licenciamento, tamanho e riscos de compatibilidade com WebView/Android/offline.

**Recomendação provisória:** começar com arquitetura independente do renderer e uma implementação topológica mínima, mantendo Three.js para viewport. Fazer prova de conceito comparativa antes de escolher ou integrar bibliotecas para booleanas. Não fixar biblioteca ou formato topológico sem testar o primeiro conjunto de operações reais.

## 7. Sequência recomendada para a Frente B

### B0 — Fundação de modelagem (pré-requisito técnico da Frente B)

- Definir documento de projeto versionado que represente objetos, parâmetros, transformações, hierarquia, recursos, topologia e atributos.
- Separar o núcleo geométrico da interface e do Three.js.
- Definir contrato de geração/atualização de geometria de renderização.
- Criar sistema de comandos com undo/redo transacional e validação.
- Definir seleção e identidade estável para componentes e elementos topológicos.
- Definir limites de custo, cancelamento e estado de erro para operações caras.
- Criar fixtures sintéticas de malhas simples e fixtures reais representativas.

**Aceite:** criar uma primitiva, converter em malha editável, selecionar um vértice, mover, desfazer/refazer, salvar/reabrir e exportar sem perder a estrutura suportada.

### B1 — Primitivas paramétricas consolidadas

- Validar tube e parâmetros.
- Parametrizar resolução e limites.
- Permitir manter a primitiva paramétrica ou converter para malha editável.
- Definir quando os parâmetros deixam de ser preservados após operações de topologia.

**Aceite:** editar parâmetros, converter, operar na malha e exportar; resultado validado em teste.

### B2/B3 — Topologia mínima + seleção localizada

- Implementar vértices, arestas, faces e loops com identidade estável.
- Gerar buffers de renderização e mapa inverso face/triângulo → face topológica.
- Começar por modo vértice, depois aresta e face.
- Implementar seleção simples, múltipla e por região; movimentar; pivô; undo/redo.
- Suporte a seleção em objetos importados apenas quando conversão for explícita e validada.

**Aceite:** selecionar e transformar vértices/arestas/faces em malha de teste, mantendo topologia, material e UV.

### B4 — Operações básicas antes das booleanas

Ordem sugerida: duplicar/separar/extrair; apagar; soldar; extrusão; subdivisão; corte por plano; preenchimento; simetria; dissolver. Implementar validadores e reparo entre etapas.

Booleanas ficam em subetapa separada após topologia estável e casos de teste robustos.

### B5/B6 — Superfícies, perfis e sólidos derivados

Começar pelo protótipo de placa subdividida e deformação de pontos de controle. Evoluir para curvas/perfis, extrusão e loft, espessura/casca e UVs. Manter parâmetros não destrutivos quando possível e oferecer conversão explícita para malha.

### B7 — Construção manual de tecido/roupa

Construir ferramentas de painéis e superfícies em camadas usando a fundação já testada. Não iniciar simulação física junto com a primeira modelagem manual.

### B8/B9 — DSL e qualidade do gerador

Evoluir a DSL para representar recursos já suportados pelo núcleo. Separar a avaliação de qualidade do gerador: comparar resultados manuais e gerados em modelos de referência. A IA não deve ser considerada solução para limitações do motor geométrico.

## 8. Como a interface deveria evoluir antes de receber a Frente B

Não recomendo acrescentar uma longa fileira de botões ao Criador atual. O workspace de modelagem deve organizar as ferramentas conforme o contexto:

- **Viewport como área central**, com gestos e seleção adequados.
- **Modo atual explícito:** Objeto, Vértice, Aresta ou Face.
- **Ferramentas contextuais:** só mostrar operações válidas para o modo e seleção atual.
- **Outliner/hierarquia:** objetos e grupos, com bloqueio, visibilidade e isolamento.
- **Inspetor:** parâmetros de primitiva ou atributos da seleção.
- **Barra de operações:** comandos mais usados, com ações destrutivas protegidas.
- **Painel adaptável:** no telefone, abas/gavetas; em telas maiores, painel lateral.
- **Estado e histórico:** desfazer/refazer, progresso e mensagens claras.

É melhor mostrar menos comandos irrelevantes e contextualizar ferramentas do que colocar tudo disponível o tempo todo.

## 9. Relação com as outras frentes e ordem

- A Frente A registra a integridade de importação/exportação e round-trip; ela fornece requisitos importantes para o núcleo geométrico.
- A Frente C trata experiência móvel, guia e robustez. Parte do sistema visual e da ergonomia é infraestrutura transversal para B.
- O índice central do projeto registra a decisão anterior de executar D antes de B. A Frente D está atualmente congelada por decisão do usuário neste contexto; este parecer não reabre D nem altera seu branch/PR.
- A Frente B pode avançar em **análise, desenho arquitetural e protótipo isolado** sem alterar D. A implementação integrada deve respeitar as dependências que forem necessárias.
- A auditoria arquitetural do PR #16 e este parecer devem convergir: primeiro organizar shell/contratos/design system; depois criar o núcleo de modelagem; só então adicionar as ferramentas de modelagem avançada.

Não recomendo iniciar a Frente B em paralelo com mudanças profundas no mesmo arquivo monolítico que a auditoria pretende desmontar. Isso criaria retrabalho e conflito entre duas direções arquiteturais.

## 10. Riscos e decisões que precisam ser demonstradas por protótipo

- Representação topológica e conversão confiável para formatos com diferentes semânticas.
- Preservação de UVs, múltiplos materiais, grupos e hierarquia durante operações locais.
- Desempenho e memória no Android ao atualizar malhas interativas.
- Seleção precisa por toque em telas pequenas.
- Undo/redo de operações grandes sem duplicar memória excessivamente.
- Booleanas robustas e reparo de malhas não-manifold.
- Continuidade/suavidade de superfícies, perfis e loft.
- Conversão de superfícies em objetos compatíveis com Blockbench quando houver limitações do formato.

Cada risco deve ter um protótipo pequeno e testes próprios antes de ser generalizado.

## 11. O que não recomendo

- Não implementar booleanas antes de existir representação topológica e validação.
- Não tratar BufferGeometry como se fosse automaticamente uma malha de edição topológica.
- Não colocar todas as ferramentas em uma toolbar plana.
- Não usar o DSL como atalho para substituir o motor geométrico.
- Não misturar modelagem manual de roupas com simulação física no primeiro marco.
- Não reescrever os três editores ao mesmo tempo.
- Não migrar toda a UI para Compose para resolver um problema de arquitetura Web.
- Não fazer a Frente B depender de alterações não planejadas na Frente D.

## 12. Minha opinião final

Você está certo em desconfiar que a Frente B exige mudanças profundas. O tamanho dela não está no número de ferramentas, mas no fato de que várias ferramentas dependem de uma fundação que o aplicativo atual ainda não foi organizado para oferecer.

Eu não começaria pela criação das ferramentas B2–B7. Começaria pelo B0: núcleo geométrico separado, documento de projeto, comandos reversíveis, seleção e ponte de renderização. Em paralelo, arrumaria o workspace e o sistema visual para receber essas capacidades.

Isso também ajuda o aplicativo fora da Frente B: a mesma infraestrutura melhora consistência de botões, inspeção de propriedades, histórico, persistência, importação/exportação e clareza de fluxos.

**A primeira entrega da Frente B deveria ser um pequeno caso completo:** criar uma caixa, convertê-la em malha editável, selecionar e mover um vértice, desfazer/refazer, salvar/reabrir e exportar. Se essa vertical funcionar bem no Android, a arquitetura terá provado o caminho. Depois entram arestas/faces, extrusão, subdivisão, superfícies e roupas.

Este parecer é uma recomendação técnica baseada nos documentos e no código disponíveis. Não altera o código da Frente B nem da Frente D.