# Frente D — Revisão de engenharia ponto a ponto
## Perguntas obrigatórias: por que importa, como fazer, alternativa se falhar, caminho simples, implementação e estado do planejamento

**Prioridade:** Frente D vem antes da Frente B.
**Escopo:** revisão de todos os componentes funcionais da Frente D. Capacidade/performance foi retirada da urgência, a pedido do usuário; permanecem apenas requisitos básicos de integridade e preservação do projeto.
**Base:** plano ampliado da Frente D e arquivo atual `NYRA_MODEL_DSL.md`, além de documentação pública de Blockbench/Minecraft Bedrock.
**Estado:** planejamento; nada deste documento declara implementação concluída.

## 0. Resultado da revisão e decisões

O plano anterior descrevia o que entregar, mas nem sempre explicava o método de engenharia, a alternativa caso a abordagem falhe e a primeira versão mais simples. Esta revisão preenche essas lacunas.

Decisões:
1. Primeiro destino Minecraft: Bedrock Entity; Block, Item e Attachable ficam como perfis separados futuros.
2. Um documento canônico será a fonte de verdade para gerador, importador, viewport, Criador de Personagens, RoboTV e exportadores.
3. O gerador produz dados Bedrock-aware desde a autoria; o exportador não inventa bones/pivôs/cubos no final.
4. Primeira geração Minecraft prioriza bones e cubos.
5. Esfera/cilindro/cone não serão chamados de primitivas Bedrock nativas: no perfil Bedrock serão aproximações por cubos/voxels, com decisão explícita; no perfil geral podem continuar meshes.
6. Mesh livre é preservada no modo geral; exportação Bedrock bloqueia quando não há representação validada. Não usar poly_mesh deprecated como solução nova.
7. Primeiro pacote é um Resource Pack independente para uma entidade de teste; merge de packs existentes vem depois.
8. Clips importados primeiro são preservados e exibidos; depois editados; depois exportados. Ler JSON não equivale a integrar a timeline.
9. Controllers são diferentes de clips e não serão inventados automaticamente.

## 1. Perfil Minecraft e detector de formato

**Por que é importante?** Um `.bbmodel` pode representar Bedrock Entity, Block, Generic Model, Hytale ou outro template. Extensão não prova compatibilidade e o exportador de entidade não serve automaticamente para blocos/itens.

**Como fazemos isso?** Criar detector independente da UI: ler JSON; detectar versão; ler `model_format` e metadados; classificar tipo; associar perfil; apresentar capacidades e pedir destino quando houver conversão.

**Se falhar?** Se a versão/tipo for desconhecido ou inconsistente, não adivinhar. Abrir inspeção genérica, preservar origem, explicar que não foi identificado e permitir escolha manual com avisos.

**Jeito fácil?** Suportar inicialmente apenas Bedrock Entity conhecido e encaminhar os outros para inspeção genérica.

**Como implementar?** `detectBbmodelFormat(data)` e `resolveExportProfile(project, target)` em módulo isolado com tabela de identificadores e testes. Não misturar com viewport.

**Está planejado?** Parcialmente antes; agora há fallback seguro e perfil inicial definido.

## 2. Documento canônico Nyra

**Por que é importante?** Sem uma fonte única, gerador, Criador de Personagens e RoboTV mantêm representações diferentes; o exportador tenta reconstruir dados perdidos.

**Como fazemos isso?** Documento independente do Three.js com nodes/IDs, tipos group/bone/cube/mesh/locator, hierarquia, transforms locais, pivôs separados da origem geométrica, geometria, UV por face, materiais/texturas, animações/canais/keyframes, metadados de origem e perfil de destino.

**Se falhar?** Reduzir ao mínimo Bedrock Entity (bones, cubos, pivôs, UV, textura e clips básicos), preservando dados não compreendidos em metadados opacos. Não criar três formatos paralelos.

**Jeito fácil?** Criar uma camada adaptadora sobre o modelo de componentes atual e migrar gradualmente, sem reescrever todos os editores de uma vez.

**Como implementar?** Definir `NyraProject`, `NyraNode`, `BoneNode`, `CubeNode`, `MeshNode`, `LocatorNode`, `TextureAsset`, `Material`, `AnimationClip`, `AnimationChannel` e `Keyframe`; adicionar `schemaVersion`, serializador, desserializador e adaptador para Three.js; testar salvar/reabrir.

**Está planejado?** Parcialmente; tipos mínimos, migração e adoção progressiva agora estão detalhados.

## 3. Gerador automático e DSL — lacuna crítica

### Situação atual verificada no DSL atual

`NYRA_MODEL_DSL.md` define JSON version 1 com `components`, IDs, tipos e hierarquia. Tipos: `group`, `box`, `sphere`, `cylinder`, `cone`. Rotação em radianos, pivô local e cor hexadecimal. Valida IDs, tipos, pais, ciclos, vetores, dimensões e cores; documenta 500 componentes. As formas são meshes poligonais Three.js com UV padrão. O documento afirma que ainda não gera cubos Blockbench, esqueleto, texturas pintadas ou UV personalizados.

Portanto, hoje o gerador é de modelos 3D gerais, não um gerador Bedrock. Isso não deve ser descrito como compatibilidade Minecraft já existente.

**Por que é importante?** O foco declarado é Minecraft. Se o DSL continuar criando meshes genéricas, o exportador teria que inventar bones, pivôs, cubos e UVs no final, possivelmente sem conversão fiel.

**Como fazemos isso?** Evoluir DSL v1, sem descartá-lo, para perfis `bedrock_entity` e `generic_3d`. No primeiro, `box` gera CubeNode real ligado a bone; groups definem hierarquia; pivôs e UVs são propriedades explícitas. No segundo, mantém meshes Three.js.

**Se falhar?** Se a migração v1 regredir, manter parser v1 e adicionar parser v2 com conversão explícita para documento canônico. Se uma forma não tiver representação Bedrock, marcá-la não exportável e preservar no modo geral. Se rigging não estiver pronto, lançar primeiro geração estática com cubos.

**Jeito fácil?** Primeira entrega Bedrock suporta apenas group + box, mas com cubos reais, hierarquia e pivô. UV personalizado e animação entram depois. Isso é mais útil que quatro primitivas bonitas sem export correto.

**Como implementar?** Parser v1 permanece. Converter JSON v1 para documento canônico. Acrescentar target/version opcionais. Em perfil Bedrock, `box` cria CubeNode em vez de `THREE.Mesh`; `group` cria nó hierárquico; pivô é armazenado no documento. Criar preview Three.js a partir dos CubeNodes e usar o mesmo validador do exportador.

**Está planejado?** Parcialmente; esta é uma lacuna crítica identificada pela leitura do DSL. O plano agora define evolução incremental e primeira entrega.

## 4. Primitivas matemáticas e aproximações

**Por que é importante?** Cubos são a unidade previsível da geometria de entidade Bedrock; esfera/cilindro/cone do Three.js não equivalem automaticamente a primitiva de entidade Bedrock.

**Como fazemos isso?** Box → cubo Bedrock. Sphere/cylinder/cone → aproximação por cubos/voxels apenas quando o usuário escolhe resolução/qualidade; preservar parâmetros originais. Mesh arbitrária fica no perfil geral.

**Se falhar?** Oferecer composição mais simples de cubos ou manter como mesh geral não exportável. Nunca fabricar um export falso.

**Jeito fácil?** Começar somente com box. Composição de cubos já cria criaturas e personagens Minecraft-style.

**Como implementar?** Função pura `primitiveToBedrockCubes(primitive, resolution)` retorna CubeNodes com IDs, pai, dimensões e UV; validador verifica antes da aplicação. A função não altera viewport diretamente.

**Está planejado?** Parcialmente; agora algoritmo, controle de resolução e adiamento estão especificados.

## 5. Conversões matemáticas e coordenadas

**Por que é importante?** Convenções distintas podem espelhar, inverter, deslocar ou girar incorretamente modelo e animações.

**Como fazemos isso?** Biblioteca de funções puras: vetores, unidades, rotações, ordem Euler, cubo origin, pivô bone, UV por face e canais/tempo. Comparar com arquivos exportados pelo Blockbench da versão-alvo.

**Se falhar?** Bloquear o perfil/recurso afetado e preservar o documento. Isolar erro com fixture mínima; não mascarar com correção manual no viewport.

**Jeito fácil?** Testar primeiro um cubo assimétrico sem rotação; acrescentar pivot, eixo, rotação e UV um por vez.

**Como implementar?** Testes unitários por conversor, baseados em pares de entrada/saída produzidos pelo Blockbench e round-trip. Não copiar fórmulas de terceiros sem confirmar.

**Está planejado?** Parcialmente antes; agora há uma escada de testes e fallback explícitos.

## 6. Importação BBModel

**Por que é importante?** O usuário precisa trazer projetos Blockbench e continuar editando sem perder bones, cubos, hierarchy, texturas, pivôs e animações. `.bbmodel` é formato interno versionado, não JSON genérico.

**Como fazemos isso?** Adaptadores versionados: parse; detectar versão/model_format; resolver `groups` e `outliner`; mapear UUID/hierarquia; converter bones/cubos/UV; importar texturas e locators; importar clips/canais; validar referências; emitir relatório.

**Se falhar?** Versão desconhecida: inspeção segura e metadados preservados ou recusa clara. Canal desconhecido: preservar dado original e importar canais reconhecidos. Textura ausente: pedir arquivo ou mostrar placeholder, sem associação ambígua.

**Jeito fácil?** Começar somente Bedrock Entity e Kintsugi; não implementar todos os templates num passo.

**Como implementar?** Fixtures de versões BBModel antiga e 5+; adaptadores por versão; UUID map; conversor para documento canônico; transação com candidato temporário.

**Está planejado?** Método estava previsto, mas precisa ser auditado contra importador atual para não duplicar código.

## 7. Hierarquia, bones e pivôs

**Por que é importante?** Animação Bedrock referencia bones pelo nome; hierarquia determina transformações herdadas; pivôs definem articulação. Achatar em uma malha destrói essas relações.

**Como fazemos isso?** Preservar grupos/bones vazios, pais/filhos, ordem e IDs; separar pivô e origem; manter transforms locais; sincronizar árvore, viewport e timeline.

**Se falhar?** Permitir preview estático apenas com aviso de que rig não foi preservado; manter estrutura original como metadado e não sobrescrever a versão integral.

**Jeito fácil?** Preservar a hierarquia existente primeiro, sem criar todas as ferramentas de rigging de imediato.

**Como implementar?** Grafo de nodes com IDs estáveis, parentId e local transform. Validar órfãos, ciclos e duplicatas. Exportador mapeia bones.

**Está planejado?** Planejado com método; validar nos arquivos reais ainda é pendente.

## 8. Texturas e UV

**Por que é importante?** Geometry correta pode ficar branca/invisível ou com faces erradas se UV, imagem e dimensões não corresponderem.

**Como fazemos isso?** Preservar bytes e dimensões reais; resolver assets embutidos/externos; UV por face; rotação/espelhamento quando suportados; validar UV dentro da atlas; copiar textura e criar referências no pack.

**Se falhar?** Bloquear export completo se textura necessária faltar. Placeholder só para preview e claramente identificado; não exportar sucesso falso.

**Jeito fácil?** Primeira versão: uma textura por entidade e UV box; UV por face e múltiplas texturas entram depois.

**Como implementar?** `TextureAsset` armazena bytes/largura/altura/formato; `CubeNode` armazena UVs; preview e exporter consomem os mesmos dados.

**Está planejado?** Parcialmente; primeira entrega foi definida agora.

## 9. Animações Blockbench/Bedrock

**Por que é importante?** O objetivo é manter animações existentes, não apenas renderizar geometria. Clips referem bones e podem conter position/rotation/scale, keyframes, loop e Molang.

**Como fazemos isso?** Importar todos clips; canais por bone; preservar tempo, loop, keyframes e interpolação; manter Molang como expressão estruturada; validar nomes com geometria; disponibilizar na RoboTV.

**Se falhar?** Preservar o clip original como metadado; identificar o que é preservado mas não reproduzido/editável; não descartar canais desconhecidos.

**Jeito fácil?** Começar por clips de rotação em bones, mantendo todos os demais clips contabilizados e os dados originais guardados. Ampliar para posição, escala, interpolações e Molang.

**Como implementar?** `AnimationClip → channels → boneId → keyframes`; parser por versão; runtime adapter para timeline; serializer Bedrock. Não executar Molang como JavaScript.

**Está planejado?** Parcialmente; estratégia incremental de preservar/preview/editar agora está definida.

## 10. Timeline RoboTV e motor de reprodução

**Por que é importante?** Parse de animação não garante que ela possa ser vista, reproduzida, editada e salva sem drift.

**Como fazemos isso?** Timeline com clips, tracks por bone, position/rotation/scale, keyframes e playhead; play/pause/stop/loop/scrub; pose-base restaurada ao parar; avaliação do timestamp atual em vez de acumular alterações frame a frame.

**Se falhar?** Timeline mínima com um clip por vez e rotação de bone. Expressões complexas ficam preservadas, mas com preview não fiel claramente indicado.

**Jeito fácil?** Uma timeline 1D com tracks por bone e rotação como primeira entrega.

**Como implementar?** Evaluator independente da UI; por frame, parte da pose-base, avalia canais no tempo e compõe hierarquia; interpolação e Molang são módulos separados.

**Está planejado?** Parcialmente; versão mínima e método do evaluator ficaram definidos nesta revisão.

## 11. Criação de animações e rigging

**Por que é importante?** O usuário também precisa criar novas animações e preparar modelos sem bones adequados.

**Como fazemos isso?** Object/group animation para modelos simples; bone animation para rig existente; canais position/rotation/scale; rigging manual com criação de bone, parent, pivot e atribuição de partes.

**Se falhar?** Usar animação por grupo/objeto quando não houver esqueleto. Não anunciar esqueleto automático se o modelo não tiver bones. Rigging permanece manual e explícito.

**Jeito fácil?** Primeiro animar rigs existentes; criação de bones e rigging vem depois.

**Como implementar?** Comandos de criar bone, definir parent/pivot e atribuir nodes; preview; validar; transação/undo; timeline cria canais no bone selecionado.

**Está planejado?** Parcialmente; prioridade incremental agora definida.

## 12. Exportador Bedrock Geometry

**Por que é importante?** Geometry JSON define modelo/bones/cubos no runtime. `.bbmodel` não é carregado pelo jogo como geometria de entidade.

**Como fazemos isso?** Exportador lê documento canônico, valida perfil/schema, serializa `format_version`, `minecraft:geometry`, description, bones, cubes, pivots, bounds e UV, aplicando adaptador matemático único.

**Se falhar?** Bloquear exportação do perfil afetado, preservar projeto e emitir diagnóstico de campo/regra. Não produzir arquivo parcial como se fosse válido.

**Jeito fácil?** Primeiro exportar um bone + um cubo com UV box, sem locators ou recursos raros.

**Como implementar?** Separar `BedrockGeometryExporter`, `BedrockCoordinateAdapter` e `BedrockGeometryValidator`; comparar fixture com export oficial Blockbench; reimportar e comparar semanticamente.

**Está planejado?** Parcialmente; serializador/adaptador/validador agora separados.

## 13. Exportador de animação, client entity e controllers

**Por que é importante?** Geometry não liga, por si só, clips à entidade. Client entity mapeia nomes curtos para identificadores longos e declara scripts/animate; controllers definem estados e transições.

**Como fazemos isso?** Gerar `animation.json`; gerar mapeamento de nomes em client entity; incluir `scripts/animate` para animação direta quando adequado; controllers apenas quando houver estados/transições escolhidos ou importados.

**Se falhar?** Fazer teste mínimo sem controller: uma entidade, um clip acionado diretamente pelo caminho suportado na client entity. Se o problema for de referência, validar curto/longo e bone.

**Jeito fácil?** Um clip único ligado diretamente e tocado; controllers ficam para etapa seguinte.

**Como implementar?** `BedrockAnimationExporter`, `ClientEntityBuilder`, `AnimationControllerExporter` opcionais e validador de referências.

**Está planejado?** Parcialmente; `scripts/animate` e caminho mínimo sem controller ficaram explícitos agora.

## 14. Resource Pack / empacotador

**Por que é importante?** Minecraft recebe estrutura de pacote, manifest, paths e referências cruzadas, não um JSON solto.

**Como fazemos isso?** Criar inicialmente um Resource Pack independente com manifest, models/entity, textures/entity, animations e arquivos entity/render/animation_controllers apenas quando necessários. Validar antes de empacotar MCPACK/ZIP.

**Se falhar?** Exportar pasta/ZIP simples para inspeção; validar manifest, UUIDs, versão, caminhos e references. Não fazer merge até o pack novo funcionar.

**Jeito fácil?** Uma entidade de teste, uma textura, uma geometria e um clip.

**Como implementar?** `ResourcePackBuilder` recebe arquivos já validados, cria pastas/manifest, verifica referências e empacota. Não contém lógica de geometria ou animação.

**Está planejado?** Parcialmente; pack mínimo independente agora foi definido.

## 15. Projeto Nyra e outros formatos

**Por que é importante?** Nem todos os formatos preservam as mesmas informações. OBJ/STL são geométricos; GLB pode ter skin/clips, mas não equivale a Molang/Bedrock; BBModel é interno/versionado.

**Como fazemos isso?** Adaptadores distintos para projeto Nyra nativo, BBModel (quando fidelidade comprovada), Bedrock Entity pack, GLB/glTF e OBJ/STL com relatório de perdas.

**Se falhar?** Manter projeto nativo como preservação integral e oferecer somente destinos comprovados. Não prometer ida e volta em OBJ/STL.

**Jeito fácil?** Priorizar projeto Nyra e Bedrock; preservar exportadores genéricos existentes sem mudanças até auditoria.

**Como implementar?** Cada formato lê o documento canônico com exporter próprio e fixtures próprias.

**Está planejado?** Parcialmente; entrega por destino e preservação do export atual ficaram explícitas.

## 16. Testes e validação

**Por que é importante?** JSON válido pode ter bones quebrados, UV inválido e referências erradas. CI verde não prova que o jogo aceitou o modelo.

**Como fazemos isso?** Unit tests de conversão; validação de schemas; referências cruzadas; round-trip; fixtures reais Kintsugi/escudo/cadeira; teste em Blockbench e Minecraft; registrar versão e Content Log.

**Se falhar?** Reduzir para fixture mínima (um bone, um cubo, uma textura, um clip) e adicionar componentes um a um; toda regressão vira teste.

**Jeito fácil?** Começar com entidade de teste de um cubo sem animação; depois um clip de rotação; por fim Kintsugi.

**Como implementar?** Fixtures versionadas, parser/serializer/validator tests e checklist manual para instalar o pack e inspecionar Content Log.

**Está planejado?** Planejado com método; a escada de diagnóstico foi detalhada nesta revisão.

## 17. Interface RoboTV

**Por que é importante?** Importar/exportar deve estar dentro da área de Animação, local em que o usuário trabalha; modelo, clip e destino ativos devem estar claros.

**Como fazemos isso?** Barra de operações; viewport; árvore de bones/grupos; lista de clips; timeline; propriedades; painel de exportação.

**Se falhar?** Acrescentar primeiro barra de botões e lista de clips ao layout atual; não redesenhar toda a RoboTV.

**Jeito fácil?** Evoluir a interface atual incrementalmente, mantendo layout conhecido.

**Como implementar?** UI chama serviços do projeto canônico; UI não faz parse, conversão matemática nem escrita de arquivos.

**Está planejado?** Parcialmente; evolução incremental e responsabilidades da UI agora definidas.

## 18. Persistência, troca entre editores e undo

**Por que é importante?** Mudar do Criador de Personagens para RoboTV não pode descartar estrutura, clips ou keyframes. Operações malsucedidas não podem corromper o projeto.

**Como fazemos isso?** ProjectStore único, IDs estáveis, operações transacionais, autosave versionado e histórico undo/redo.

**Se falhar?** Manter snapshot serializado do último estado consistente e restaurar; nunca sincronizar cópias parciais.

**Jeito fácil?** Centralizar primeiro a fonte da verdade e salvamento; expandir undo granular depois.

**Como implementar?** `ProjectStore`, API de transação e migradores; cada editor lê/escreve nesse store sem converter o projeto ao trocar de tela.

**Está planejado?** Parcialmente; transações e snapshot de recuperação foram explicitados agora.

## 19. O que fica fora da urgência

Por orientação do usuário, não colocar como caminho crítico benchmarks de vários aparelhos, tuning de memória, workers, LOD ou limites avançados de complexidade. Continuam valendo integridade do projeto, cancelamento de operações longas quando necessário e rollback em falha.

## 20. Auditoria final: todas as perguntas foram respondidas?

| Ponto | Por que importa? | Como fazemos? | Se falhar? | Jeito fácil? | Como implementar? | Estado do planejamento |
|---|---|---|---|---|---|---|
| Perfil/detector | Sim | Sim | Sim | Sim | Sim | Revisto |
| Documento canônico | Sim | Sim | Sim | Sim | Sim | Revisto |
| Gerador/DSL | Sim | Sim | Sim | Sim | Sim | Revisto; lacuna atual identificada |
| Primitivas | Sim | Sim | Sim | Sim | Sim | Revisto |
| Coordenadas | Sim | Sim | Sim | Sim | Sim | Revisto |
| Importação BBModel | Sim | Sim | Sim | Sim | Sim | Revisto |
| Bones/hierarquia | Sim | Sim | Sim | Sim | Sim | Revisto |
| Textura/UV | Sim | Sim | Sim | Sim | Sim | Revisto |
| Clips/animação | Sim | Sim | Sim | Sim | Sim | Revisto |
| Timeline | Sim | Sim | Sim | Sim | Sim | Revisto |
| Criação/rigging | Sim | Sim | Sim | Sim | Sim | Revisto |
| Geometry exporter | Sim | Sim | Sim | Sim | Sim | Revisto |
| Animation/client entity | Sim | Sim | Sim | Sim | Sim | Revisto |
| Resource Pack | Sim | Sim | Sim | Sim | Sim | Revisto |
| Outros formatos | Sim | Sim | Sim | Sim | Sim | Revisto |
| Testes | Sim | Sim | Sim | Sim | Sim | Revisto |
| Interface RoboTV | Sim | Sim | Sim | Sim | Sim | Revisto |
| Persistência/undo | Sim | Sim | Sim | Sim | Sim | Revisto |

**Resultado da verificação:** todas as áreas funcionais identificadas na Frente D receberam resposta explícita às seis perguntas. Isso significa que o planejamento agora possui motivo, método, contingência, caminho mínimo, instrução de implementação e estado do planejamento. Não significa que o código esteja pronto ou que compatibilidade Minecraft esteja comprovada: fórmulas de conversão, schema-alvo e comportamento no jogo continuam exigindo validação durante a implementação.

## 21. Fontes consultadas

- Fonte interna: `NYRA_MODEL_DSL.md`, que registra o estado real documentado do DSL v1.
- Blockbench .bbmodel: https://blockbench.net/wiki/docs/bbmodel/
- Mojang Bedrock schemas: https://github.com/Mojang/bedrock-schemas
- Microsoft Learn geometry: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/visualreference/geometry.v1.26.40
- Microsoft Learn animations: https://learn.microsoft.com/en-us/minecraft/creator/documents/animations/animationsoverview
- Microsoft Learn controllers: https://learn.microsoft.com/en-us/minecraft/creator/documents/animations/animationcontroller
- Microsoft Learn client entity: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/cliententitydocumentation/cliententitydocumentationintroduction
- Mojang Bedrock Samples: https://github.com/Mojang/bedrock-samples