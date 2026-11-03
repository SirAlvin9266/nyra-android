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
  ]
}
```

## Hierarquia e pivôs

O campo `parent` recebe o `id` de outro componente. Componentes sem `parent` são colocados na raiz. A hierarquia é mantida na cena 3D e aparece na árvore de componentes. Objetos auxiliares internos usados para realizar pivôs não aparecem como peças separadas.

Um componente pode conter filhos, inclusive quando for uma forma geométrica. Para modelos articulados, prefira criar grupos para partes como tronco, cabeça, braços, pernas, asas, cabos e lâminas.

## Validação e limites atuais

O gerador valida a estrutura antes de substituir o modelo que já está na cena. Ele rejeita IDs duplicados, tipos desconhecidos, referências a pais inexistentes, ciclos na hierarquia, vetores inválidos, dimensões não positivas e cores fora de `#RRGGBB`.

O limite atual é de 500 componentes por modelo. Os tipos geométricos são malhas poligonais Three.js; este DSL ainda não cria automaticamente cubos de Blockbench, esqueleto de animação, texturas pintadas ou mapas UV personalizados. As primitivas geradas recebem materiais com cor e UVs padrão da geometria Three.js.

## Fluxo de trabalho

1. Escreva ou cole o JSON no painel **Gerar modelo por instruções matemáticas**.
2. Toque em **Validar e gerar modelo**.
3. Se houver erro, a mensagem identifica o problema sem remover o modelo atual.
4. Se a validação passar, os componentes aparecem na árvore, podem ser selecionados e transformados separadamente.
5. Exporte como GLB para preservar a hierarquia e os materiais compatíveis. OBJ e STL têm limitações próprias.

O texto DSL é guardado como rascunho local. Nesta etapa, o modelo matemático não é serializado automaticamente no formato JSON nativo antigo do Criador de Personagens; mantenha as instruções ou exporte o resultado como GLB.

## Próxima expansão prevista

O formato foi concebido para receber novos tipos e propriedades sem exigir que uma IA específica esteja integrada ao Nyra. A evolução futura pode incluir relações de articulação, materiais mais ricos, texturas, coordenadas UV, geometrias adicionais e conversões orientadas a formatos de jogos.
