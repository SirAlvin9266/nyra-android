# Matriz de cobertura de controles — Nyra (baseline de recuperação)

Inventário estático complementar a `docs/NYRA_AUDITORIA_GERAL_APLICATIVO.md`. Presença de controle não prova funcionamento no Android.

## Oficina de Itens
| Controle | Presente | Mecanismo observado | Verificação pendente |
|---|---|---|---|
| Seleção de item | Sim | tabs/data-item e render | troca de matriz/paleta |
| Resolução 16/32/64/128 | Sim | change → setCustomResolution | redimensionamento |
| Pintura | Sim | pointerdown → editPixel | toque no WebView |
| Pintura por arraste | Não | sem pointermove no payload | especificar/implementar |
| Borracha | Sim | eraseMode | apagar/restaurar |
| Restaurar desenho | Sim | resetTexture | template atual |
| Cor | Sim | input color | paleta e nova cor |
| Grade | Sim | toggleGrid | desenho/export independente |
| PNG | Sim | paintMatrix + downloadBlob | conteúdo/dimensão/transparência |
| Matriz JSON | Sim | serialização | reabertura, se prevista |
| MCAddon | Sim | JSZip + JSON/PNG | ZIP e salvar no Android |

## Criador de Personagens
| Controle | Presente | Mecanismo observado | Verificação pendente |
|---|---|---|---|
| Visualização 3D | Sim | Three.js WebGLRenderer | render WebView |
| Orbit/zoom | Sim | OrbitControls | toque/pinch |
| Seleção individual | Sim | picking/selectedObject | alvo correto |
| Cor/HSL | Sim | inputs e material | materiais compartilhados |
| Formas | Sim | cubo/esfera/cilindro/cone | geometria/seleção |
| Transformação | Sim | TransformControls e inputs | mover/girar/escalar |
| Voxel | Sim | modos e handlers | toque preciso |
| Undo | Sim | histórico 50 ações | restauração |
| JSON | Sim | project/apply | round-trip |
| BBModel | Sim | parser/import/export | fidelidade/arquivo externo |
| GLB/OBJ/STL | adaptado no shell | NyraModelIO | exportação física |

## RoboTV / Animação
| Controle | Presente | Mecanismo observado | Verificação pendente |
|---|---|---|---|
| Viewport/câmera | Sim | Three.js/OrbitControls | toque/zoom |
| Articulações | Sim | seleção de joint | alvo correto |
| Rotação X/Y/Z | Sim | sliders | atualização do rig |
| Zerar articulação | Sim | zeroJoint | reset |
| Pose rápida | Sim | presets | pose |
| Quadros | Sim | frames | integridade timeline |
| Reproduzir/parar | Sim | playLoop/stopPlayback | estado final |
| Velocidade | Sim | speed | taxa |
| Equipamentos | Sim | equip/desequip | ancoragem/persistência |
| Salvar no celular | adaptado no shell | export bridge | seletor Android |
| JSON projeto/animação | Sim | download/loadProject | round-trip |

## Shell / Android
- Iframes dos três editores preparados eager.
- Diagnóstico de `error` e `unhandledrejection` instalado no load.
- Editor ativo e zoom ficam no localStorage.
- API nativa precisa ser revisada para limites, cancelamento, concorrência, MIME type, limpeza e reentrada.
- Guia está no shell, usa imagem local e alterna editores para destacar áreas.

## Estados
- Presente no código: controle/função/handler foi encontrado.
- Testado automaticamente: script executou asserção.
- Testado em Android: ação executada no aparelho.
- Aprovado por fidelidade: resultado comparado com referência visual/arquivo.
