# Nyra 3D Studio — DSL de modelos matemáticos

Este documento descreve o formato de instruções estruturadas que o Criador de Personagens aceita para gerar modelos editáveis. As instruções podem ser escritas manualmente ou produzidas por uma IA externa. O Nyra não precisa ter uma IA integrada.

## Formato

O documento é JSON estrito, com `version: 1` e uma lista `components`. Cada componente tem um `id` único, `type`, `name` e, opcionalmente, `parent`, posição, rotação, escala, pivô e cor.

Tipos aceitos nesta versão:

- `group`: componente organizador, sem geometria própria.
- `box`: cuboide, com `size: [x, y, z]`.
- `sphere`: esfera, com `radius`.
- `cylinder`: cilindro, com `radiusTop`, `radiusBottom` e `height`.
- `cone`: cone, com `radiusBottom` e `height`.
- `tube`: cilindro oco parametrizado, com `radiusOuter`, `radiusInner`, `height`, `openTop` e `openBottom`. Os dois campos de abertura são opcionais e usam `true` por padrão; `false` cria um fundo/tampa fechada. `radiusInner` precisa ser menor que `radiusOuter`.

As posições, dimensões e escalas usam unidades relativas coerentes dentro do modelo. `rotation` é expressa em radianos. `pivot` define o ponto local em torno do qual o componente gira e escala. `color` deve usar o formato hexadecimal `#RRGGBB`.

## Exemplo completo

```json
{
  "version": 1,
  "name": "Robô geométrico",
  "components": [
    {
      "id": "body",
      "type": "group",
      "name": "Corpo",
      "position": [0, 0, 0]
    },
    {
      "id": "torso",
      "type": "box",
      "name": "Torso",
      "parent": "body",
      "size": [1.1, 1.35, 0.55],
      "position": [0, 1.45, 0],
      "color": "#536b83"
    },
    {
      "id": "head",
      "type": "sphere",
      "name": "Cabeça",
      "parent": "body",
      "radius": 0.43,
      "position": [0, 2.42, 0],
      "color": "#a9c2d8"
    },
    {
      "id": "leftArm",
      "type": "cylinder",
      "name": "Braço esquerdo",
      "parent": "body",
      "radiusTop": 0.13,
      "radiusBottom": 0.16,
      "height": 0.95,
      "position": [-0.72, 1.42, 0],
      "rotation": [0, 0, 0.18],
      "pivot": [0, 0.38, 0],
      "color": "#879caf"
    }
    ,
    {
      "id": "cup",
      "type": "tube",
      "name": "Cilindro oco",
      "parent": "body",
      "radiusOuter": 0.5,
      "radiusInner": 0.38,
      "height": 1.2,
      "openTop": true,
      "openBottom": false,
      "segments": 32,
      "color": "#35e5ff"
    }
  ]
}
```

## Hierarquia e pivôs

O campo `parent` recebe o `id` de outro componente. Componentes sem `parent` são colocados na raiz. A hierarquia é mantida na cena 3D e aparece na árvore de componentes. Objetos auxiliares internos usados para realizar pivôs não aparecem como peças separadas.

Um componente pode conter filhos, inclusive quando for uma forma geométrica. Para modelos articulados, prefira criar grupos para partes como tronco, cabeça, braços, pernas, asas, cabos e lâminas.

## Validação e limites atuais

O gerador valida a estrutura antes de substituir o modelo que já está na cena. Ele rejeita IDs duplicados, tipos desconhecidos, referências a pais inexistentes, ciclos na hierarquia, vetores inválidos, dimensões não positivas e cores fora de `#RRGGBB`.

O limite atual é de 500 componentes por modelo. Os tipos geométricos são malhas poligonais Three.js. `tube` cria parede externa, parede interna e bordas anulares; `openTop`/`openBottom` deixam a cavidade aberta ou fecham o fundo/tampa. Este tipo ainda é uma malha geométrica, não uma entidade nativa de cubos Blockbench. O DSL ainda não cria automaticamente esqueleto de animação, texturas pintadas ou mapas UV personalizados. As primitivas geradas recebem materiais com cor e UVs padrão da geometria Three.js.

## Fluxo de trabalho

1. Escreva ou cole o JSON no painel **Gerar modelo por instruções matemáticas**.
2. Toque em **Validar e gerar modelo**.
3. Se houver erro, a mensagem identifica o problema sem remover o modelo atual.
4. Se a validação passar, os componentes aparecem na árvore, podem ser selecionados e transformados separadamente.
5. Exporte como GLB para preservar a hierarquia e os materiais compatíveis. OBJ e STL têm limitações próprias.

O texto DSL é guardado como rascunho local. Nesta etapa, o modelo matemático não é serializado automaticamente no formato JSON nativo antigo do Criador de Personagens; mantenha as instruções ou exporte o resultado como GLB.

## Próxima expansão prevista

O formato foi concebido para receber novos tipos e propriedades sem exigir que uma IA específica esteja integrada ao Nyra. A evolução futura pode incluir relações de articulação, materiais mais ricos, texturas, coordenadas UV, geometrias adicionais e conversões orientadas a formatos de jogos.

## Projetos futuros — modelagem avançada, conversão e guia

Os itens desta seção são projetos planejados e ideias de evolução. Não devem ser descritos como recursos já implementados no aplicativo.

### 1. Motor de superfícies e formas avançadas

Evoluir além das primitivas básicas (box, esfera, cilindro, cone e tube), mantendo essas primitivas como base construtiva e permitindo que o usuário gere geometrias mais complexas antes de convertê-las em malhas poligonais.

Capacidades planejadas:
- Superfícies editáveis por pontos de controle, com subdivisões configuráveis.
- Seleção e transformação local de vértices, arestas, faces e conjuntos de pontos.
- Deformação localizada: mover, girar, escalar, suavizar, achatar e elevar regiões.
- Curvas e perfis para construir superfícies orgânicas.
- Extrusão de perfis e contornos.
- Loft entre seções/perfis diferentes, com controle de percurso e correspondência entre seções.
- Espessura, cascas, bordas, camadas e pregas.
- Subdivisão e suavização com controle da malha base.
- Ferramentas para tecidos e roupas: superfícies flexíveis editáveis, dobras modeladas manualmente, saias, capas, aventais, mangas, babados e painéis.
- Futuramente, simulação de tecido com gravidade, tensão e colisão poderá ser investigada separadamente da modelagem manual.

Exemplo de referência: começar com uma placa retangular subdividida; selecionar pontos na ponta, na outra extremidade e na região central; mover cada região em direções diferentes para criar uma superfície curvada, arqueada ou rebaixada. O usuário deve poder controlar os pontos intermediários para formar volumes e dobras com intenção artística.

Critérios futuros: malha válida, normais coerentes, UVs controláveis, edição reversível por undo/redo e conversão confiável para os formatos de destino.

### 2. Representação geométrica interna e topologia

Adotar uma representação capaz de relacionar vértices, arestas, faces, materiais, UVs, grupos e transformações. Separar a malha base editável da malha triangulada gerada para visualização/exportação, quando tecnicamente viável.

Planejar operações topológicas: separar, extrair, apagar, preencher, cortar por plano, espelhar, soldar vértices, subdividir e unir. Booleanas (união, diferença e interseção) devem entrar após a base de topologia e reparo de malha, com tratamento explícito de geometria não-manifold, auto-interseções e superfícies abertas.

### 3. Fluxo Blockbench em duas operações distintas

**Importar modelo:** o seletor de importação principal deve aceitar projetos `.bbmodel` e `.json`, além dos formatos 3D já suportados, sem criar um segundo botão duplicado. Importação deve preservar o máximo possível de elementos, malhas, hierarquia/outliner, UUIDs, origens, pivôs, rotações, UV por face, texturas, materiais, grupos e animações. Recursos não representáveis devem ser relatados.

**Converter modelo para BBModel:** criar uma ação explícita que converta o estado atual da representação interna para a estrutura nativa do projeto Blockbench. Essa operação deve reconstruir elementos e grupos a partir das edições atuais, em vez de simplesmente devolver os bytes/dados originais da importação. O resultado convertido deve poder ser inspecionado antes de salvar.

**Exportar modelo:** manter os exportadores de GLB, OBJ e STL e acrescentar o `.bbmodel` convertido à família de exportações. Cada formato deve declarar suas capacidades, perdas e conversões.

A interface planejada remove o botão separado e duplicado “Importar modelo / projeto (.bbmodel, .json)” e incorpora essas extensões ao seletor principal. A ação “Exportar .bbmodel editado” deve ficar junto das exportações do editor 3D, não junto da exportação específica de personagem JSON.

### 4. Testes de interoperabilidade Blockbench

Usar fixtures reais, incluindo modelos de cubos, modelos Bedrock e malhas livres (por exemplo, escudo). Fluxo obrigatório:
1. Importar arquivo real e registrar a estrutura de origem.
2. Comparar contagem, nomes, UUIDs, hierarquia, pivôs, transforms, UV, materiais, imagens e animações.
3. Alterar componentes no Nyra.
4. Converter o estado editado para BBModel.
5. Exportar e reabrir no Blockbench.
6. Comparar novamente a estrutura e documentar toda perda/conversão.
Não considerar a exportação concluída apenas porque um arquivo foi salvo ou porque o próprio Nyra consegue reimportá-lo.

### 5. Guia interativo atualizado

Evoluir o guia para acompanhar as capacidades atuais e futuras sem apresentar planos como funcionalidades disponíveis. Incluir instruções específicas para:
- Diferença entre objeto, grupo, malha, vértice, aresta, face e superfície.
- Como escolher uma primitiva ou criar um perfil/superfície.
- Como adicionar subdivisões e selecionar pontos/elementos.
- Como mover, girar, escalar, deformar e suavizar regiões.
- Como usar extrusão, loft, espessura, camadas e pregas quando disponíveis.
- Como inspecionar hierarquia, geometria, UV, materiais, pivôs e animações.
- Como importar `.bbmodel`/`.json` pela entrada principal e como resolver recursos/texturas externos.
- Diferenças entre converter para BBModel e exportar para GLB/OBJ/STL.
- Avisos de compatibilidade e perdas por formato.
- Como desfazer, restaurar e preservar cópias antes de operações destrutivas.

O guia deve identificar claramente recursos por estado: “Disponível”, “Em desenvolvimento” ou “Planejado”. Ao selecionar uma ferramenta ainda não implementada, não mostrar instruções fictícias nem destacar controles inexistentes. O robô oficial do guia deve usar `nyra_personagem.json` como fonte de identidade, conforme a especificação já registrada no PR.

### 6. Organização e aceitação

Manter o guia, os mapeamentos e as ferramentas alinhados ao mesmo catálogo de recursos. Toda nova ferramenta precisa ter: explicação no guia, indicação de seleção/uso, suporte a desfazer quando aplicável, validação geométrica e testes de exportação.

As frentes acima são viáveis como projetos graduais, mas exigem etapas e validação próprias. Não tratar a inclusão deste plano no repositório como conclusão das implementações.
