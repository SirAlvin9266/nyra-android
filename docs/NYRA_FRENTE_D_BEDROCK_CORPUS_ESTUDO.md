# Frente D — estudo estrutural do corpus Bedrock

**Data:** 11/11/2026  
**Branch:** `work/nyra-frente-d-integration`  
**Objetivo:** converter a análise integral de dois add-ons Bedrock em requisitos técnicos verificáveis para a Nyra 3D Studio.

## 1. Fontes e limites

- Dragon Evolution v1.5.0 — autor indicado nos manifests: About04.
- Novatsug's Extra Clothes v1.11 — autor indicado nos manifests: NovatsugPlays.

O README do Dragon Evolution, presente nos dois pacotes internos, proíbe republicação do add-on e reutilização de seus arquivos em outros projetos. O Extra Clothes não contém README equivalente no arquivo enviado; a licença pública indicada para o projeto é All Rights Reserved. Este registro contém apenas contagens, padrões técnicos e requisitos gerais. Nenhum modelo, textura, animação ou código dos add-ons foi copiado para o repositório.

## 2. Inventário global

| Métrica | Dragon Evolution | Extra Clothes | Total |
|---|---:|---:|---:|
| Arquivos `.geo.json` | 235 | 43 | 278 |
| Definições `minecraft:geometry` | 234 | 42 | 276 |
| Bones | 4.967 | 610 | 5.577 |
| Cubos | 9.289 | 1.034 | 10.323 |
| Cubos rotacionados | 5.255 | 183 | 5.438 |
| Cubos com inflate | 5.266 | 680 | 5.946 |
| UV por face | 6.287 | 25 | 6.312 |
| UV de caixa | 3.002 | 1.009 | 4.011 |
| Entradas de locator | 20 | 0 | 20 |
| Cubos com mirror explícito | 292 | 83 | 375 |
| Ocorrências de UV rotation | 239 | 0 | 239 |

As modalidades UV por face e UV de caixa aparecem em todo o corpus. Há 457 cubos com mapeamento por face incompleto, portanto faces omitidas precisam continuar omitidas na exportação.

### Versões encontradas

| format_version | Dragon Evolution | Extra Clothes |
|---|---:|---:|
| 1.8.0 | 1 | 1 |
| 1.12.0 | 218 | 42 |
| 1.16.0 | 12 | 0 |
| 1.21.0 | 4 | 0 |

### Hierarquia

- Dragon Evolution: 4.731 bones com pai; 854 bones sem cubos próprios.
- Extra Clothes: 568 bones com pai; 111 bones sem cubos próprios.
- Bones sem cubos não podem ser descartados: podem atuar como pivôs, articulações ou pais de outros bones.
- O corpus não contém `poly_mesh` nem `texture_meshes`.
- Foram identificadas 9 ocorrências de `binding`, 20 entradas de locator e 32 usos de `material_instance` em faces no Dragon Evolution.

## 3. Famílias de modelos

### Dragon Evolution

| Caminho relativo a models | Arquivos |
|---|---:|
| `entity/races/legacy_hairs` | 88 |
| `entity/opponents` | 36 |
| `entity/items/armors` | 19 |
| `entity/npcs` | 19 |
| `blocks` | 15 |
| `entity/items` | 8 |
| `entity/races` | 8 |
| `entity` (raiz) | 7 |
| `entity/animals` | 6 |
| `entity/items/weapons` | 6 |
| `entity/projectiles` | 6 |
| `entity/races/hairs` | 4 |
| `entity/races/frost_demon` | 3 |
| `entity/races/majin` | 3 |
| `entity/vehicles` | 3 |
| `entity/props` | 2 |
| `entity/races/saiyan` | 2 |

### Extra Clothes

| Caminho relativo a models | Arquivos |
|---|---:|
| `entity/items/armors` | 36 |
| `entity/races` | 4 |
| `entity/races/glind` | 1 |
| `entity` (raiz) | 1 |
| `entity/npcs` | 1 |

## 4. Casos de maior complexidade

### Dragon Evolution

| Arquivo | Bones | Cubos |
|---|---:|---:|
| `entity/npcs/shenron.geo.json` | 82 | 197 |
| `entity/races/legacy_hairs/caulifla_ssj_hair.geo.json` | 50 | 159 |
| `entity/races/legacy_hairs/gine_ssj4_hair.geo.json` | 57 | 135 |
| `entity/npcs/porunga.geo.json` | 39 | 126 |
| `entity/props/time_machine.geo.json` | 27 | 124 |
| `entity/opponents/dr_wheelo.geo.json` | 27 | 122 |
| `entity/races/legacy_hairs/goku_ssj5_hair.geo.json` | 63 | 117 |
| `entity/races/legacy_hairs/gine_ssj_hair.geo.json` | 45 | 113 |
| `entity/vehicles/capsule_991.geo.json` | 8 | 105 |
| `entity/animals/pterosaur.geo.json` | 47 | 98 |

### Extra Clothes

| Arquivo | Bones | Cubos |
|---|---:|---:|
| `entity/races/majin.geo.json` | 126 | 133 |
| `entity/items/armors/clothes.geo.json` | 14 | 55 |
| `entity/items/armors/special_clothes.geo.json` | 16 | 49 |
| `entity/items/armors/yurin_clothes.geo.json` | 13 | 47 |
| `entity/items/armors/great_saiyaman_clothes.geo.json` | 14 | 44 |
| `entity/items/armors/bulma_clothes.geo.json` | 14 | 42 |
| `entity/items/armors/battle_armor.geo.json` | 13 | 40 |
| `entity/races/frost_demon.geo.json` | 31 | 35 |

Os extremos demonstram que complexidade não é só quantidade de cubos: há modelos com hierarquia profunda e muitos bones, inclusive bones sem geometria própria.

## 5. Animações e controladores

| Métrica | Dragon Evolution | Extra Clothes | Total |
|---|---:|---:|---:|
| Arquivos de animação | 43 | 2 | 45 |
| Definições de animação | 186 | 2 | 188 |
| Canais | 1.965 | 7 | 1.972 |
| Keyframes | 3.237 | 21 | 3.258 |
| Arquivos de controladores | 28 | 0 | 28 |

Propriedades dos canais: `rotation` 1.276; `position` 564; `scale` 132.

**Decisão arquitetural:** geometria, animações e controladores são camadas/documentos separados. `.geo.json` não armazena animações nem controladores. O contrato Nyra deve preservar clips, canais, keyframes, expressões e metadados mesmo quando ainda não consegue reproduzi-los.

## 6. Requisitos para a Frente D

### Fidelidade de geometria

1. Preservar a árvore de bones e os bones sem cubos.
2. Preservar pivôs, rotação de bones e transformações locais.
3. Preservar cubos: `origin`, `size`, `pivot`, `rotation`, `inflate` e `mirror`.
4. Suportar UV de caixa e UV por face.
5. Preservar faces omitidas e a inversão UV especial de `up`/`down`.
6. Preservar `uv_rotation` e `material_instance`.
7. Preservar locators, inclusive `offset`, `rotation` e `ignore_inherited_scale`.
8. Preservar metadados de bones como `binding`, `reset`, `mirror`, `inflate`, `material` e propriedades desconhecidas.
9. Não converter malhas livres em cubos por aproximação silenciosa.

### Versões e validação

1. Preservar a versão original na importação.
2. Selecionar automaticamente a versão mínima compatível com os recursos exportados.
3. Rejeitar versão forçada inferior à necessária.
4. Validar nomes/IDs, pais, ciclos, vetores, dimensões e UVs.
5. Avisar sobre dados preservados mas não editáveis/reproduzidos.
6. Não declarar compatibilidade no Minecraft apenas porque o JSON é válido.

### Texturas e animações

- O `.geo.json` declara dimensões de textura e mapeamentos UV, mas não incorpora o PNG.
- Texturas precisam ser tratadas como assets separados.
- Animações e controladores devem permanecer em arquivos separados.

## 7. Regras de conversão verificadas

O codec Bedrock do Blockbench confirma as regras abaixo:

| Dado | Blockbench → Bedrock |
|---|---|
| Pivô de bone | `[-x, y, z]` |
| Origem de cubo | `[-to.x, from.y, from.z]` |
| Dimensão do cubo | `to - from` |
| Pivô de cubo rotacionado | `[-origin.x, origin.y, origin.z]` |
| Rotação de bone/cubo | `[-x, -y, z]` |
| UV `up`/`down` | início deslocado ao canto oposto e tamanho invertido |

O eixo X é espelhado; Y e Z não são negados. Rotação usa uma regra separada: X e Y são negados; Z permanece.

### Versão mínima conforme recursos

- Base: `1.12.0`.
- Pivôs de cubos rotacionados: `1.14.0` ou superior, considerando a nota do esquema sobre o comportamento de pivot em 1.12.
- Bone `binding`: `1.16.0` ou superior.
- `uv_rotation`: `1.21.0` ou superior.

Se vários recursos coexistirem, selecionar a versão mais alta exigida. A versão mínima do jogo-alvo ainda precisa ser respeitada.

## 8. Correções aplicadas ao conversor inicial

No módulo `android/scripts/bedrock_geometry_v1.cjs`:

- Corrigida a origem de cubo: antes os três eixos eram negados; agora é usada a fórmula do Blockbench.
- Corrigidos pivôs: somente X é espelhado.
- Corrigidas rotações: X/Y são negados; Z é preservado.
- Adicionada conversão especial de UV para faces `up` e `down`.
- Adicionado suporte a UV de caixa e sobrescrita de mirror por cubo.
- Adicionada seleção automática de `format_version` para pivot, binding e UV rotation.
- `visible_bounds` deixou de ser calculado a partir da resolução da textura.
- O contêiner raiz interno da Nyra não é mais exportado como bone Bedrock.
- Metadados e locators são preservados no projeto Nyra e retornam ao export quando suportados.
- O importador reconstrói dimensões assimétricas e pivôs usando a convenção de coordenadas do Blockbench.

O teste `android/scripts/audit_bedrock_geometry_v1.cjs` agora cobre coordenadas assimétricas, hierarquia, pivôs, rotação, UV de caixa, UV por face, UV `up`/`down`, `uv_rotation`, `material_instance`, mirror, inflate, locators, binding, versão mínima, reabertura e rejeição explícita de malhas livres.

## 9. Limitações e status

- O corpus analisado é majoritariamente cubo-based; não conter `poly_mesh`/`texture_meshes` não prova que esses recursos não existam no Bedrock.
- Malhas livres arbitrárias ainda não são convertidas para Geometry Bedrock.
- A geometria original é preservada em `extensions.bedrockGeometryOriginal`; recursos desconhecidos não devem ser descartados.
- O `.geo.json` não incorpora imagens PNG.
- A auditoria não renderiza os modelos nem executa os add-ons no Minecraft.
- O teste sintético não substitui validação visual no Blockbench e carregamento no Minecraft Bedrock.

Estado:
- [x] Inventário estrutural de todos os 278 arquivos `.geo.json`.
- [x] Contagem de bones, cubos, pivôs, rotações, inflate, mirror, UV e locators.
- [x] Inventário de animações, canais, keyframes e controladores.
- [x] Identificação de casos de alta complexidade.
- [x] Comparação das regras de conversão com o codec do Blockbench e a documentação Microsoft.
- [x] Correções iniciais no conversor e ampliação do teste de regressão.
- [x] Importação com seleção de múltiplas definições `minecraft:geometry` (índice explícito e preservação integral do arquivo original).
- [x] Fixtures sintéticas para `1.8.0`, múltiplas geometrias, bones sem cubos e locators vetoriais/estruturados/sem offset editável.
- [ ] CI verde após esta revisão.
- [ ] Ensaio visual no Blockbench.
- [ ] Ensaio de carregamento no Minecraft Bedrock.

## 10. Referências públicas

- Microsoft Learn — [Geometry v1.12.0 schema](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/schemasreference/schemas/minecraftschema_geometry_1.12.0?view=minecraft-bedrock-stable)
- Microsoft Learn — [Geometry v1.12.0 visual documentation](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/visualreference/geometry.v1.12.0?view=minecraft-bedrock-stable)
- Blockbench — [Bedrock geometry codec](https://github.com/JannisX11/blockbench/blob/master/js/formats/bedrock/bedrock.js)
- Blockbench — [Bedrock multi-file integration](https://github.com/JannisX11/blockbench/blob/master/js/formats/bedrock/bedrock_multi_file.ts)

Este documento deve ser atualizado no mesmo PR da Frente D sempre que a cobertura de importação/exportação mudar.