# Nyra 3D Studio — Frente D: pesquisa técnica e plano ampliado de implementação
## Importação Blockbench, compatibilidade Minecraft Bedrock, animação, exportação e integração RoboTV

**Prioridade:** Frente D deve ser executada antes da Frente B.
**Natureza:** plano técnico baseado na documentação pública consultada em 11/11/2026 e nos requisitos já registrados. Não representa implementação nem validação concluída.

## 1. O que o Minecraft Bedrock aceita — distinção fundamental

O `.bbmodel` é um formato JSON interno de projeto do Blockbench, não o arquivo que o Minecraft carrega diretamente. A extensão também não define o tipo de projeto: é necessário ler `model_format`, metadados e versão do arquivo. O Blockbench documenta mudanças de versão, incluindo a separação de `groups` e `outliner` no formato 5 e mudanças nas convenções de keyframes. Portanto, o importador precisa ser version-aware.

Para entidades Bedrock, o destino principal é a geometria `*.geo.json`, organizada em `format_version`, `minecraft:geometry`, `description` e `bones`. A descrição identifica a geometria e declara resolução real da textura e bounds visíveis. Bones definem as partes animáveis, suas ligações e os elementos de geometria; cada bone pode ter nome, parent, pivot, rotation, cubes e locators. O nome do bone é usado pelos arquivos de animação.

Os cubos Bedrock carregam origin, size e UV; quando aplicável também rotation, pivot, inflate e mirror. A UV pode ser retangular/box ou declarada por face (down, east, north, south, up, west), com coordenadas, tamanho e rotação da região. Assim, um modelo compatível não é somente um conjunto de vértices: é uma estrutura de ossos, cubos, transformações e UVs coerente.

### 1.1 Animações e controladores são coisas diferentes

Animações Bedrock guardam movimento bruto: bones, canais de position/rotation/scale, keyframes, duração, loop e, quando compatível, expressões Molang. Os tempos são em segundos; as rotações documentadas são em graus, na ordem X-Y-Z. Os canais de animação referenciam os nomes dos bones definidos na geometria.

Animation controllers definem quando tocar animações, estados e transições. Não são sinônimos de clips. A client entity liga geometry, materials, textures, animations, animation_controllers e render_controllers por identificadores/nome curto. Os arquivos precisam estar nas pastas apropriadas do Resource Pack. Behavior Pack só deve ser acrescentado quando o comportamento solicitado realmente exigir.

### 1.2 Malhas livres: limitação crítica

O schema moderno consultado documenta `poly_mesh` como deprecated e avisa que conteúdo novo que use esse recurso pode gerar content errors. O schema também lista `texture_meshes`, mas esse recurso converte texels da textura em voxels; não é um suporte universal para qualquer mesh arbitrária.

Política da Nyra:
- preservar mesh livre no documento canônico e permitir preview/edição genérica;
- não afirmar que toda mesh Blockbench será exportável como entidade Bedrock;
- não usar `poly_mesh` como estratégia padrão de exportação nova;
- verificar recursos disponíveis no schema e versão de destino;
- quando não existir representação segura, bloquear a exportação Bedrock daquele elemento ou oferecer conversão opt-in claramente descrita;
- nunca transformar uma mesh complexa em centenas de cubos silenciosamente;
- se houver voxelização/cubificação futura, estimar número de cubos, perda de detalhe, UV, desempenho e impacto nas animações antes de confirmar.

### 1.3 Formatos de projeto Bedrock não são intercambiáveis

Bedrock Entity, Bedrock Block, Item/Attachable, Generic Model e Hytale precisam de perfis diferentes. O primeiro escopo de exportação será **Bedrock Entity**, alinhado ao Kintsugi e à animação por bones. Identificar os outros formatos corretamente, mas não declarar exportação suportada até existir adaptador e teste próprios.

## 2. Como configurar a Nyra — arquitetura

Separar o pipeline em camadas:
1. File intake: seleção/leitura segura.
2. Format detector: extensão, conteúdo, versão e tipo/model_format.
3. Format adapter: converte origem para documento canônico.
4. Canonical project document: representação interna independente de formato.
5. Scene/preview adapter: cria objetos de renderização.
6. Animation engine: avalia clips e canais sobre pose-base.
7. Destination validator: verifica destino e versão.
8. Destination exporter: gera arquivos Bedrock ou outros formatos.
9. Round-trip validator: reimporta e compara semântica.
10. UI integration: conecta viewport, árvore, timeline e controles.

Importador não deve escrever diretamente na cena final ou timeline. Primeiro cria documento/candidato temporário, valida e só então troca o projeto ativo.

## 3. Documento canônico Nyra

Conter, no mínimo:
- projectId, schemaVersion, sourceFormat, sourceFormatVersion, sourceModelFormat;
- destinationProfile e targetMinecraftVersion quando definidos;
- metadados de origem preservados sem interpretação destrutiva;
- eixos, unidades e convenção de coordenadas;
- nodes com IDs estáveis, tipo, nome, parentId, ordem e filhos;
- transforms locais/globais e pivô separado da origem geométrica;
- cubos e meshes com faces, índices, normais e topologia original;
- UV por face/canto da face, materiais e referências a texturas;
- bytes/dimensões reais de assets incorporados e dependências externas;
- bones, locators, clips, canais, keyframes, interpolações, loop, duração, eventos e expressões;
- relatório de avisos, conversões e perdas.

Dados Blockbench/Bedrock ainda não compreendidos devem ficar em `sourceMetadata`/`extensions`, para que salvar um projeto não apague informações só porque a UI ainda não as edita. Toda mudança de schema requer migrador, backup e testes de abertura/salvamento de projetos antigos.

IDs internos não devem depender do nome visível. Renomear bone deve atualizar todas as referências atomicamente, verificar duplicatas e permitir desfazer.

## 4. Importador BBModel com consciência de versão

### 4.1 Diagnóstico preliminar
- Validar tamanho e JSON.
- Ler versão, `model_format`, `resolution`, `elements`, `groups`, `outliner`, `textures` e `animations`.
- Detectar templates Bedrock Entity/Block, Generic, Hytale etc.
- Tratar versões antigas e Blockbench 5+, incluindo a separação de grupos e outliner e alterações de convenção dos keyframes.
- Mostrar ficha com grupos, bones, cubos, meshes, texturas, clips, canais e dependências ausentes antes de alterar a cena.

### 4.2 Hierarquia e cubos
- Construir mapa UUID→elemento/grupo e percorrer outliner recursivamente.
- Preservar ordem, nome, UUID, pai/filhos e grupos vazios que funcionam como pivô.
- Detectar UUID duplicado, child inexistente, ciclo e órfãos.
- Para cubos, mapear `from`, `to`, origin, rotation, inflate, mirror e faces UV sem confundir origem do cubo com pivot do bone.
- Testar UV box, UV por face, UV rotation, mirror, cubos rotacionados, faces ausentes e dimensões inválidas.

### 4.3 Meshes
- Importar vértices, faces, normais, UV por face e material por face.
- Manter topologia original; triangulação pode ser cópia derivada para renderização, nunca substituto dos dados de origem.
- Preservar associação a grupo/bone e transforms.
- Separar sucesso de preview interno de compatibilidade Bedrock.

### 4.4 Texturas
- Decodificar assets incorporados sem recompressão desnecessária.
- Resolver caminhos relativos de acordo com versão do BBModel.
- Suportar seleção múltipla de dependências externas quando necessário.
- Não associar somente por basename se houver ambiguidade.
- Conferir dimensões reais, transparência, UV e paths.

### 4.5 Animações importadas
- Ler todos os clips, nomes, loop, duração e canais.
- Preservar keyframes, timecodes, tipos/curvas e expressões.
- Mapear UUID de grupo/bone ao identificador de bone usado na geometria.
- Validar referências e contabilizar clips/canais/keyframes importados, preservados sem preview, ou ignorados com motivo.
- Não descartar silenciosamente eventos, partículas, sons ou dados específicos do formato.

### 4.6 Transação
Construir o novo projeto temporário, conferir hierarquia/geometria/UV/textura/animações, apresentar diagnóstico, e substituir o ativo somente após sucesso. Falha ou cancelamento mantém cena, câmera, seleção e documento anteriores.

## 5. Integração RoboTV/Animação

### 5.1 Estado comum
- Criador de Personagens e RoboTV devem usar o mesmo documento canônico.
- Não manter uma cópia simplificada independente na RoboTV.
- Seleção/transformação no viewport deve sincronizar com árvore e timeline.
- Troca de editor não pode descartar clips, keyframes ou alterações não salvas.
- IDs persistentes devem manter seleção e referências após salvar/reabrir.
- Undo/redo deve abranger operações estruturais e animação.

### 5.2 Interface
Na própria área RoboTV/Animação disponibilizar:
- Importar modelo;
- Importar animações;
- Salvar projeto;
- Exportar modelo;
- Exportar animações;
- Exportar pacote Minecraft Bedrock;
- lista de clips, árvore de bones/grupos, viewport, timeline e propriedades do canal/keyframe.

Não considerar suficiente deixar exportação apenas no rodapé geral do Criador de Personagens.

### 5.3 Timeline e reprodução
- Faixa de clips; árvore hierárquica; trilhas por bone/node; canais position/rotation/scale; marcadores de keyframe; escala temporal e playhead.
- Play, pause, stop, scrub, loop, duração e tempo atual.
- Avaliar a pose sempre a partir da pose-base e do tempo atual; nunca acumular transformação frame a frame.
- Compor a hierarquia pai-filho corretamente.
- Ao parar, restaurar pose-base por padrão.
- Testar seek para frente/trás, pause/resume, loop e troca rápida de clips.

### 5.4 Interpolação e Molang
- Preservar o tipo de interpolação original; não trocar por linear sem aviso.
- Implementar no preview somente os tipos efetivamente suportados.
- Preservar Molang original como expressão; não avaliar Molang como JavaScript.
- Se não houver evaluator compatível, informar que a expressão é preservada para exportação, mas não simulada fielmente no preview.
- Um evaluator futuro deve implementar subconjunto versionado e testado, não executar expressões arbitrárias.

### 5.5 Três modalidades de animação
- Objeto/grupo: keyframe em transform de node.
- Esqueleto: keyframe de bones, respeitando pose-base e pivôs.
- Keyframes: inserir, mover, duplicar, copiar/colar e apagar canais/frames.
- Rigging: criar bones/grupos, pivôs e atribuições de partes somente por ação explícita, com preview, validação e rollback.
- Modelos sem bones não devem receber promessa de animação esquelética; oferecer animação por grupo ou preparação manual.

## 6. Exportação Bedrock

### 6.1 Perfil de destino
Antes do export, selecionar/fixar versão-alvo do Minecraft Bedrock e schema correspondente. Não escolher `format_version` arbitrariamente nem gerar sempre o schema mais novo. Criar perfis versionados com matriz de capacidades e testes.

### 6.2 Geometry
Gerar `*.geo.json` com `format_version`, `minecraft:geometry`, identifier, bounds, textura_width/height, bones, nomes, pais, pivôs, rotação, locators, cubos e UVs. Incluir somente propriedades válidas para o schema selecionado. Validar referências, dimensões, orientação e bounds.

### 6.3 Conversão de eixos
Implementar uma conversão centralizada Blockbench↔Bedrock. Testar modelos assimétricos, inversão de X, sinais de rotação, rotação combinada, pais rotacionados e pivôs próprios. Não corrigir eixos em múltiplas camadas. Rodar round-trip e comparar transforms.

### 6.4 Animações
Gerar `animations/*.animation.json` com versionamento e identificadores. Mapear exatamente nomes de bones, posição/rotação/escala, segundos, duração, loop, keyframes, interpolação e Molang quando suportados. Relatar qualquer conversão ou dado não reproduzido.

### 6.5 Client entity e controllers
Gerar `entity/*.entity.json` quando o objetivo for entidade. Ligar geometry, materials, textures, animations e render controllers por identificadores corretos. Gerar controllers apenas quando escolhidos ou já presentes; não inventar estados, transições ou lógica. Controllers definem execução; clips definem movimento.

### 6.6 Resource Pack
Gerar estrutura independente com `manifest.json`, `entity/`, `models/entity/`, `animations/`, `animation_controllers/`, `render_controllers/` e `textures/entity/` conforme arquivos efetivamente necessários. Validar caminhos e referências cruzadas. Behavior Pack é separado e só entra quando o comportamento solicitado exigir.

### 6.7 Merge com pack existente
Planejar como fase posterior: abrir ZIP/pasta, ler manifests, mostrar conflitos e arquivos que serão alterados, backup e merge controlado. Nunca sobrescrever arquivos silenciosamente; preservar conteúdo não relacionado.

### 6.8 Malhas não compatíveis
Preservar no projeto Nyra. Se não houver representação Bedrock válida na versão escolhida, bloquear exportação direta daquele elemento, com explicação. Não utilizar `poly_mesh` como solução padrão porque é deprecated no schema moderno. `texture_meshes` não é substituto genérico de mesh arbitrária. Conversão para cubos/voxels deve ser operação futura, opcional, com estimativa de fidelidade, quantidade de cubos, UV e custo.

## 7. Outras exportações

- Projeto Nyra: saída nativa com documento canônico e metadados de origem.
- `.bbmodel`: oferecer apenas após provar abertura e fidelidade no Blockbench da versão alvo.
- GLB/glTF: formato 3D geral; manter skin/clips quando pipeline suportar, sem prometer equivalência Molang/Bedrock.
- OBJ/STL: saída geométrica com aviso claro de perda de bones, animações e metadados.
- Bedrock Block/Item/Attachable: perfis/exportadores separados; não reutilizar o exportador de entidade sem adaptação.

## 8. Diagnóstico e UX

Antes da importação mostrar origem, versão, model_format, destino inferido, geometria, hierarchy, UVs, texturas, clips, canais, dependências, estimativa de memória e incompatibilidades.

Após importar mostrar categorias: preservado sem conversão; convertido; preservado como metadado sem preview; ignorado com motivo; dependência ausente.

Antes de exportar mostrar destino/versão, arquivos que serão gerados, erros bloqueantes, avisos e perdas previstas. Exemplos: 28 clips encontrados/importados; expressão Molang preservada mas não simulada; mesh mantida no projeto mas sem export Bedrock seguro; OBJ não preserva ossos/animações.

## 9. Testes e casos reais

### 9.1 Kintsugi — teste principal
`kintsugi.bbmodel`: referência conhecida com 38 cubos, 24 grupos e 28 animações. Exigir que os 28 clips sejam contabilizados, associados a bones existentes, exibidos na RoboTV, reproduzidos, editados, salvos e reabertos. Depois exportar e verificar a equivalência no Minecraft.

### 9.2 Spartan shield
`spartan_shild_editavel.bbmodel`: mesh livre. Testar importação/preview, UV e materiais, preservando topologia. Verificar e comunicar a limitação de exportação Bedrock; não presumir compatibilidade.

### 9.3 Cadeira chinesa
`chinese-armchair.bbmodel`: identificar corretamente Hytale prop, não classificar como Bedrock Entity. Testar diagnóstico e fluxo de conversão separado.

### 9.4 Fixtures sintéticas
Criar fixtures para cubos/UV box; UV por face e UV rotation; mirror; inflate; pivô e rotação; bone vazio; hierarquia profunda; locator; múltiplas texturas; dependência externa; clip com position/rotation/scale; loop e sem loop; pre/post; Molang; bone ausente/duplicado; parent inexistente/ciclo; mesh com UV seam; versões BBModel antigas e 5+; client entity com referência quebrada.

### 9.5 Round-trip
Importar → documento canônico → exportar → reimportar → comparar hierarquia, nomes, pivôs, geometria, UVs, texturas, clips e keyframes. JSON não precisa ser textualmente idêntico; precisa ser semanticamente equivalente, descontadas perdas explicitamente documentadas.

### 9.6 Teste real no jogo
Instalar o Resource Pack na versão Bedrock alvo; verificar que aparece sem erros; carregar uma entidade de teste com client entity; consultar Content Log; conferir escala, orientação, bounds, textura, UV, transparência, clips e controllers. Registrar versão, passos e evidência. CI verde não substitui esse teste.

## 10. Desempenho e segurança

- limites configuráveis de tamanho, nós, faces, textura e keyframes;
- estimativa de memória antes do parse/render pesado;
- parsing e decodificação em etapas, com cancelamento;
- descarte de recursos antigos somente após troca transacional;
- evitar bloquear UI/WebView durante imagens grandes;
- não reduzir qualidade automaticamente sem medição e opção;
- limitar logs e mensagens por arquivo, sem perder diagnóstico.

## 11. Plano de execução completo

### D1 — Auditoria técnica do aplicativo
Mapear importadores/exportadores atuais, paths de BBModel, código que lê clips, adaptadores, estado compartilhado, timeline RoboTV, Criador de Personagens e persistência. Identificar o que funciona e o que está duplicado. Não reescrever antes do diagnóstico.
**Entrega:** inventário de módulos, diagrama de fluxo, matriz de suporte atual e plano de alterações sem duplicação.

### D2 — Perfil Bedrock e schemas versionados
Escolher versão-alvo inicial; obter schema oficial; criar fixtures de geometry/animation/client entity/controller/manifest; desenvolver validadores estruturais e matriz de capacidades.
**Entrega:** perfil versionado testado.

### D3 — Documento canônico
Implementar estrutura interna, metadados opacos, IDs, hierarchy, pivôs, UV por face, assets e clips; migração e persistência.
**Entrega:** salvar/reabrir mantendo dados cobertos.

### D4 — Importador Bedrock Entity
Implementar detector por metadados/versão; importar bones, cubos, pivôs, UV, texturas, locators, clips; diagnóstico e transação.
**Entrega:** Kintsugi com 38 cubos, 24 grupos e 28 clips contabilizados.

### D5 — Integração RoboTV e timeline
Conectar documento canônico; sincronizar árvore/viewport/timeline; reprodução por pose-base; object/group, bones, keyframes; editar/salvar/reabrir.
**Entrega:** edição funcional de clip importado.

### D6 — Exportador Geometry Bedrock
Gerar geometry JSON versão-alvo; converter eixos; bones/cubos/UV/bounds; política de mesh incompatível; validação schema e round-trip.
**Entrega:** geometry validado e reimportado.

### D7 — Exportador Animation e client entity
Gerar animation JSON e ligações no client entity; controllers somente quando necessários; validar Molang e referências.
**Entrega:** clips associados corretamente aos bones e entidade.

### D8 — Empacotador Resource Pack
Gerar manifest, diretórios e arquivos; novo pack independente primeiro; merge de pack existente depois com backup e diff.
**Entrega:** Resource Pack estruturalmente válido e importável.

### D9 — Teste no Minecraft
Testar Kintsugi na versão-alvo; consultar Content Log; comparar com Blockbench; corrigir e transformar cada falha em fixture de regressão.
**Entrega:** relatório reprodutível de teste no jogo.

### D10 — UX final RoboTV
Colocar importar/exportar dentro da área de Animação; painel de clips, árvore, timeline, propriedades, diagnóstico e destinos.
**Entrega:** fluxo completo na própria RoboTV, Android/WebView e desktop suportados.

### D11 — Outros formatos e destinos
Ampliar para Bedrock Block/Item/Attachable, export BBModel, GLB e demais formatos com adaptadores e contratos separados.
**Entrega:** matriz de capacidades comprovada por testes. Não anunciar suporte antes de validar.

## 12. Critérios de aceite da Frente D

1. Botões de importar/exportar dentro da área RoboTV/Animação.
2. `.bbmodel` identificado por metadados e versão, não apenas extensão.
3. Hierarquia, bones, pivôs, cubos, UVs e texturas preservados.
4. Kintsugi importa e contabiliza os 28 clips e as referências aos bones.
5. Timeline reproduz e permite editar clips importados.
6. Salvar/fechar/reabrir não perde estrutura ou animação.
7. Geometry e animation JSON gerados segundo versão-alvo.
8. Client entity/controller references válidas.
9. Resource Pack aberto e testado no Minecraft real.
10. Mesh incompatível fica preservada no projeto e não é exportada falsamente como Bedrock.
11. Falha/cancelamento não destrói projeto anterior.
12. Fluxo validado no Android/WebView e desktop suportados.

## 13. Fontes da pesquisa

- Blockbench — formato `.bbmodel`: https://blockbench.net/wiki/docs/bbmodel/
- Blockbench — matriz de recursos por formato: https://blockbench.net/wiki/blockbench/formats/
- Microsoft Learn — geometry 1.21.0: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/visualreference/geometry.v1.21.0
- Microsoft Learn — geometry 1.26.40: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/visualreference/geometry.v1.26.40
- Microsoft Learn — animações: https://learn.microsoft.com/en-us/minecraft/creator/documents/animations/animationsoverview
- Microsoft Learn — animation controllers: https://learn.microsoft.com/en-us/minecraft/creator/documents/animations/animationcontroller
- Microsoft Learn — animations vs controllers: https://learn.microsoft.com/en-us/minecraft/creator/documents/animationsvscontrollers
- Microsoft Learn — client entity: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/cliententitydocumentation/cliententitydocumentationintroduction
- Microsoft Learn — Resource Packs: https://learn.microsoft.com/en-us/minecraft/creator/documents/resourcepack
- Microsoft Learn — latest platform version guidance: https://learn.microsoft.com/en-us/minecraft/creator/documents/practices/latestplatformversion
- Mojang Bedrock Samples — animation reference: https://mojang.github.io/bedrock-samples/Animations.html

## 14. Conclusões técnicas da pesquisa

- `.bbmodel` é um projeto interno e versionado; precisa de adaptadores por versão.
- Bedrock Entity é centrado em bones/cubes, pivôs, UVs e nomes de bones ligados às animações.
- Animações guardam movimento; controllers definem execução; client entity liga os recursos visuais.
- `poly_mesh` está marcado como deprecated no schema moderno; não deve ser a base de exportação nova.
- `texture_meshes` existe, mas não equivale a suporte irrestrito para mesh arbitrária.
- A versão do Minecraft/schema deve ser definida antes de fixar o exportador.
- Malhas livres podem permanecer suportadas dentro da Nyra para preview/edição genérica sem que isso signifique compatibilidade Bedrock.
- A exportação mais confiável para entidades animadas deve priorizar cubos associados a bones e dados Bedrock compatíveis, com perdas sempre relatadas.
---

# ADENDO — COMO IMPLEMENTAR AS CAPACIDADES DESDE O INÍCIO
## Arquitetura operacional, conversão por etapas e impacto no gerador automático

Este adendo complementa o plano anterior. A decisão principal é impedir que o gerador, o importador, a timeline e o exportador criem representações independentes e só tentem conciliá-las no final.

## A. Regra arquitetural: o gerador deve criar um documento Bedrock-aware

O gerador automático tem Minecraft como destino prioritário. Portanto, ele não deve criar primeiro um modelo 3D genérico e deixar para o botão Exportar tentar convertê-lo integralmente para Minecraft. Isso faria o exportador ter que inventar ossos, pivôs, UV, hierarquia e compatibilidades tardiamente.

A proposta é um **documento canônico Nyra com perfil Bedrock desde a geração**, mas que não seja exclusivo de Bedrock. Ele terá:

1. Núcleo 3D geral: nodes, transforms, geometria, faces, materiais, texturas e animações genéricas.
2. Camada Bedrock: bones, cubos Bedrock, pivôs, UV por face, locators, convenção de eixos, identificadores, versão-alvo e extensões específicas.

Quando o destino do projeto for Bedrock Entity, o gerador cria diretamente elementos que já tenham representação válida nesse destino. Uma forma incompatível pode continuar existindo no modo 3D geral, mas deve ser marcada como incompatível ou exigir conversão consciente antes da exportação.

**Regra:** o exportador serializa uma estrutura já preparada e validada para Bedrock; não cria retrospectivamente uma estrutura Minecraft que nunca existiu no documento.

## B. Como o gerador deve criar formas compatíveis

### B1. DSL com semântica Minecraft

Ampliar o DSL v1, em vez de criar um gerador paralelo, para descrever explicitamente:
- destino/perfil inicial: Bedrock Entity;
- versão-alvo do schema;
- bones, parent e hierarquia;
- pivôs de bones;
- cubos ligados a bones;
- origem, dimensões, rotação, inflate e mirror;
- UV box e UV por face;
- textura e resolução real;
- locators;
- clips, duração, loop e canais position/rotation/scale;
- keyframes e interpolação compatível;
- parâmetros matemáticos originais para regeneração.

Continuar permitindo que o usuário descreva formas, dimensões, proporções, posições, rotações, escalas, grupos reutilizáveis e peças paramétricas. A diferença é que no perfil Minecraft o resultado semântico precisa caber no contrato de geometria Bedrock selecionado.

### B2. Dois perfis de autoria

**Perfil Minecraft Bedrock Entity (principal):**
- uma descrição como 'dragão com corpo, cabeça, asas, pernas e cauda' gera grupos/bones;
- definir parents e pivôs nos pontos de articulação;
- representar volumes como cubos associados aos bones;
- aplicar UV e textura com dimensões reais;
- atribuir IDs estáveis às partes;
- opcionalmente criar clips e keyframes;
- validar desde a criação contra o perfil Bedrock.

**Perfil 3D geral (secundário):**
- permite meshes livres e recursos genéricos;
- serve para preview e exportação geral;
- não promete compatibilidade Bedrock;
- mostra incompatibilidades antes da exportação.

### B3. Mapeamento de primitivas

| Primitiva no gerador | Estratégia inicial Bedrock | Observação |
|---|---|---|
| Caixa/cubo | Cubo Bedrock associado a bone | Conversão direta |
| Conjunto de caixas | Vários cubos no mesmo bone ou bones filhos | Preservar hierarquia lógica |
| Cabeça/corpo/membro | Bone/grupo com pivô e cubos filhos | Pivô no ponto de articulação |
| Esfera | Aproximação por cubos/voxels | Resolução e erro visíveis antes de gerar |
| Cilindro/cone | Aproximação por camadas de cubos/voxels ou modo 3D geral | Conversão opt-in e custo estimado |
| Mesh personalizada | Mesh no núcleo 3D geral | Não marcar como exportável Bedrock sem validação |
| Peça articulada | Bone com parent e pivot | Exige hierarquia coerente |
| Ponto de encaixe | Locator | Nome e transform persistentes |

O gerador pode continuar oferecendo esfera, cilindro e cone. No perfil Bedrock, porém, deve aproximá-los por cubos/voxels com resolução selecionável ou encaminhá-los ao modo geral. Mostrar quantidade de cubos, fidelidade estimada, impacto de textura e custo antes de executar. Se a aproximação ficar muito pesada, permitir cancelar ou reduzir resolução conscientemente.

### B4. Manter a forma matemática original

Guardar os parâmetros que originaram a forma, além dos cubos derivados. Assim, se o usuário alterar raio, altura, espessura ou resolução, a Nyra pode reconstruir apenas aquela peça sem obrigar o usuário a editar centenas de cubos manualmente. Os dados originais de autoria não podem se perder no processo.

### B5. Gerar e validar no mesmo momento

Para cada primitiva: receber parâmetros → verificar o perfil → gerar diretamente a forma Bedrock se suportada → caso contrário apresentar opções → criar candidato → validar → pré-visualizar → aplicar com undo. O gerador deve usar o mesmo validador que o exportador.

## C. Como o exportador realmente deve funcionar

O exportador precisa ser um serializador determinístico, não um segundo modelador.

### C1. Pré-condições
- documento íntegro e destino Bedrock Entity selecionado;
- versão-alvo fixada;
- bones com nomes válidos e únicos;
- parents existentes e sem ciclos;
- cubos e dimensões válidos;
- UV dentro dos limites e textura encontrada;
- textura declarada com a mesma resolução real;
- animações referindo bones existentes;
- meshes incompatíveis resolvidas ou removidas apenas com consentimento;
- todos os assets externos resolvidos.

### C2. Pipeline concreto

1. Criar snapshot imutável do documento a exportar.
2. Executar validador geral Nyra.
3. Executar validador específico Bedrock/schema.
4. Resolver assets e nomes de arquivos.
5. Converter eixos, pivôs, origem, rotação e UV por um módulo matemático único.
6. Serializar geometry JSON.
7. Serializar animation JSON.
8. Serializar controllers apenas se existirem ou forem solicitados.
9. Gerar client entity e render controller necessários.
10. Montar diretórios e manifest do Resource Pack.
11. Validar todos os JSON pelos schemas da versão-alvo.
12. Validar referências cruzadas entre geometria, bones, texturas, clips e controllers.
13. Reimportar os arquivos gerados em um documento temporário e comparar semanticamente.
14. Criar relatório de arquivos, avisos e perdas.
15. Empacotar como MCPACK/ZIP ou exportar diretório, conforme o destino.
16. Somente então disponibilizar o arquivo final para salvar.

### C3. Conversão matemática centralizada

Criar funções puras e isoladas para conversão de vetores, rotations, bone pivots, cube origin, face UV e animation channels entre o documento canônico e Bedrock. Não espalhar inversões de eixo e sinais negativos pela interface, viewport e exportadores.

Há notas técnicas de terceiros que descrevem conversões Blockbench→Bedrock, incluindo inversão de X em posições e ajustes em rotações e UVs por face. Elas são pistas para montar testes, não autoridade suficiente para copiar fórmulas diretamente. Antes de implementar, comparar com arquivos exportados pelo próprio Blockbench da versão-alvo e com o código oficial do exportador.

Os testes matemáticos devem incluir modelos assimétricos, pivôs fora da origem, pais rotacionados, cubos rotacionados, UV por face e várias rotações combinadas. Testar ida e volta para garantir que a conversão não acumule erros.

### C4. Não exportar a partir de objetos do Three.js

Objetos do viewport são representações de renderização e podem estar triangulados, conter matrizes acumuladas, materiais de preview e objetos auxiliares. O exportador deve ler dados semânticos do documento canônico, nunca tentar reconstruir bones, pivôs ou UVs a partir da cena visual.

## D. Biblioteca de capacidades e validação

Desenvolver quatro blocos reutilizáveis antes de espalhar funcionalidades pelas telas:

1. **Core de dados:** documento canônico e migrações.
2. **Biblioteca matemática:** eixos, unidades, pivôs, cubos, UV, tempo e transforms.
3. **Validador:** regras gerais do documento e regras Bedrock por versão.
4. **Adaptadores:** BBModel→canônico, canônico→Bedrock Geometry, canônico→Bedrock Animation, canônico→Resource Pack e canônico→formatos genéricos.

Depois conectar viewport, árvore, timeline e botões. O mesmo validador deve ser usado pelo gerador, importador, editor e exportador.

## E. Capacidade do aplicativo e desempenho

Como a Nyra roda em Android/WebView, medir pico de memória, não apenas tamanho do arquivo.

### E1. Métricas a medir
- bytes comprimidos do arquivo;
- tamanho JSON após parse;
- quantidade de bones, grupos, cubos, faces, vertices e keyframes;
- dimensões e memória decodificada das texturas;
- número de objetos, materiais e buffers GPU;
- buffers temporários durante import/export;
- tamanho do Resource Pack gerado.

### E2. Processamento por etapas
- parse e validação sem criar recursos GPU;
- resolver e decodificar assets;
- construir documento canônico;
- criar preview sob demanda;
- montar exportação em buffers/arquivos temporários;
- liberar temporários ao concluir, falhar ou cancelar.

Evitar manter várias cópias integrais do JSON, de imagens decodificadas e de cenas ao mesmo tempo.

### E3. Limites

Definir limites configuráveis para tamanho, quantidade de nós/bones/cubos, faces/vértices, resolução/quantidade de texturas e keyframes. Não inventar limites definitivos sem medições em aparelhos. Começar conservador, registrar picos e ajustar. Ao exceder, dizer qual recurso excedeu e oferecer simplificação, divisão ou desktop.

### E4. Cancelamento e atomicidade

Importação e exportação devem permitir cancelamento. Criar candidatos e arquivos temporários; só substituir o projeto ou finalizar o pacote no sucesso. Limpar temporários em qualquer resultado e jamais apagar o projeto anterior para liberar memória antes de haver rollback.

### E5. Android

Testar aparelhos com capacidades diferentes, retomada do aplicativo, rotação, perda de WebView, limites do processo e concorrência de decodificação. Usar worker apenas se o WebView e a arquitetura realmente suportarem. Modo simplificado nunca deve reduzir qualidade silenciosamente.

## F. Impacto no gerador automático: Minecraft desde a autoria

O gerador não deve ser uma ferramenta genérica que tenta adivinhar no final como tornar qualquer forma em modelo Minecraft. O foco Bedrock precisa estar presente na criação.

- Perfil principal inicial: Bedrock Entity.
- Perfis futuros separados: Bedrock Block, Item/Attachable.
- Perfil secundário: 3D geral.
- O usuário seleciona perfil e versão-alvo.
- O DSL v1 é ampliado, não substituído.
- A saída do DSL é o documento canônico; não diretamente uma cena Three.js ou um JSON final do jogo.
- O documento valida cada operação no perfil escolhido.

### F1. Como o gerador trata formas

Box vira cubo Bedrock. Conjunto de caixas vira vários cubes organizados em bones. Partes articuladas criam bones com parent e pivot. Esfera, cilindro e cone usam aproximação voxel/cubos com parâmetros e resolução explícitos, ou ficam no perfil geral. Mesh arbitrária permanece no núcleo geral até existir um caminho Bedrock comprovado.

### F2. Regeneração paramétrica

Guardar a definição matemática original e identificar os elementos derivados. Alterar uma dimensão deve reconstruir apenas a peça relacionada, atualizar UV/estrutura necessária e preservar animações e conteúdo não relacionado. As operações precisam de IDs estáveis, preview e undo.

### F3. O que isso resolve

Se o gerador já produz bones, pivôs, cubos e UV Bedrock-aware, o exportador não precisa converter uma esfera genérica, inventar uma hierarquia ou descobrir pivôs. Ele só verifica e serializa. O preview e o exportador consomem a mesma representação, reduzindo divergências.

## G. Fluxo técnico fim a fim

1. Usuário escolhe Bedrock Entity e versão-alvo.
2. DSL cria bones, pivôs, cubos, UVs e metadados paramétricos.
3. Documento canônico valida cada operação.
4. Preview renderiza exatamente esse documento.
5. RoboTV anima bones/grupos existentes.
6. Importador converte projetos externos para o mesmo documento.
7. Exportador valida e serializa sem reinterpretar a geometria.
8. Empacotador cria Resource Pack e referências.
9. Round-trip e Minecraft real confirmam o resultado.

## H. Ordem técnica revisada

**D1 Auditoria:** incluir gerador, DSL v1, estado atual, importadores, exportadores, timeline e persistência.
**D2 Perfil Bedrock:** fixar primeira versão-alvo e schemas; montar matriz de capacidades.
**D3 Documento canônico:** definir estrutura geral + camada Bedrock.
**D4 Biblioteca matemática e validação:** implementar conversões e regras com fixtures antes de conectá-las à UI.
**D5 Gerador automático:** evoluir DSL existente para produzir documentos Bedrock-aware desde a origem.
**D6 Importador BBModel:** adaptar projetos externos ao documento comum.
**D7 Timeline RoboTV:** compartilhar estado, reproduzir e editar.
**D8 Exportadores:** serializar Geometry, Animation e referências.
**D9 Resource Pack e round-trip:** empacotar, validar, reimportar e comparar.
**D10 Testes reais:** abrir no Minecraft e medir no Android.
**D11 UX e outros destinos:** finalizar telas e então ampliar destinos separados.

## I. Critérios adicionais de conclusão

- Gerador Bedrock cria documento compatível desde a autoria, não por remendo no export.
- Uma caixa DSL vira cubo Bedrock com dimensões, pivot e UV corretos.
- Uma peça articulada vira bone com parent/pivot corretos.
- Esfera/cilindro/cone mostram aproximação, resolução e custo antes da geração.
- Mesh geral nunca aparece como exportável Bedrock sem validação.
- Gerador, importador, editor e exportador usam o mesmo validador.
- Exportador apenas serializa/empacota; não corrige estrutura fundamental.
- Preview e export usam o mesmo documento.
- Limites de capacidade são definidos por medições Android.

## J. Fontes complementares desta revisão

- Blockbench .bbmodel: https://blockbench.net/wiki/docs/bbmodel/
- Blockbench formatos e capacidades: https://blockbench.net/wiki/blockbench/formats/
- Microsoft Learn geometry schema: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/visualreference/geometry.v1.26.40
- Mojang bedrock-schemas: https://github.com/Mojang/bedrock-schemas
- Minecraft animation overview: https://learn.microsoft.com/en-us/minecraft/creator/documents/animations/animationsoverview
- Minecraft actor animation schema: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/visualreference/actor_animation.v1.8.0
- Animation controllers: https://learn.microsoft.com/en-us/minecraft/creator/documents/animations/animationcontroller
- Client entity: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/cliententitydocumentation/cliententitydocumentationintroduction
- Bedrock samples animation: https://mojang.github.io/bedrock-samples/Animations.html
- Notas de conversão Blockbench→Bedrock de terceiros, usadas apenas como pista para testes: https://github.com/Kaioga5/BBModel-Unpack/blob/main/docs/FORMAT-NOTES.md

**Nota:** fórmulas observadas em implementações de terceiros devem ser confirmadas contra o exportador oficial do Blockbench e os schemas da versão-alvo antes de serem adotadas em produção.