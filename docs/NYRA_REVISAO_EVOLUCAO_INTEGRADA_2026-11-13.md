# Nyra 3D Studio — revisão de evolução integrada (13/11/2026)

## Escopo e método

Revisão complementar à PR #16, cruzando o diagnóstico arquitetural existente com o estado atual da branch `work/nyra-robotv-dynamic-hierarchy`, PRs #17/#19, issues #11/#18/#20/#21 e os arquivos efetivamente embarcados no shell Android.

A análise de código é estática. O usuário relatou falhas reais de uso em seu aparelho, mas esta revisão não teve acesso a uma sessão WebView interativa no aparelho. Portanto, resultados de CI e presença de handlers não são classificados como validação funcional.

## 1. Linha de base verificada

- Repositório: `SirAlvin9266/nyra-android`; branch padrão: `main`.
- Trilha de auditoria: PR #16, branch `work/nyra-application-audit`, HEAD `84024b2cb658469219a8783ecc904bba3ed93498`, Draft, 15 commits, 8 arquivos alterados; CI do HEAD passou.
- Trilha de edição/modelos: PR #19, branch `work/nyra-robotv-dynamic-hierarchy`, HEAD `474839ac1e609855e1784cd011a108cbf94e97cb`, Draft, 108 commits, 11 arquivos alterados; build e auditorias CI passaram.
- Exportação Bedrock: PR #17, Draft, branch `work/nyra-front-d-model-export-hardening`. Manter fora da execução da revisão geral enquanto a Frente D estiver congelada.
- Issue #11: validação física continua aberta.
- Issue #18: requisitos do RoboTV continuam abertos.
- Issue #20: preparação DSL → scene-transfer continua aberta.
- Issue #21: reorganização do Criador e associação de peças criada em 13/11/2026.

As PRs #16 e #19 têm bases distintas. Não devem ser mescladas mecanicamente: antes de combinar código, é necessário reconciliar o branch-base e verificar quais alterações de cada linha foram incorporadas. Não alterar `main` nem mesclar PRs sem autorização explícita.

## 2. Arquitetura encontrada no código atual da PR #19

### 2.1 Shell e editores

O arquivo `android/app/src/main/assets/www/index.html` tem aproximadamente 290 KB (290.262 caracteres na revisão consultada) e 446 linhas. O shell contém:
- Três páginas completas armazenadas em Base64.
- Navegação e ciclo de vida dos editores em iframes com `srcdoc`.
- Adaptação Android, seleção/exportação de arquivos e persistência.
- Integração da modelagem 3D/DSL e componentes inseridos por template/string.
- Comunicação por `postMessage` entre shell, Criador e RoboTV.
- Guia, diagnóstico, zoom e modo desktop.

Tamanhos decodificados conferidos:
- Oficina de Itens: 23.971 caracteres.
- Criador de Personagens: 70.121 caracteres.
- RoboTV: 57.554 caracteres.

As cópias independentes de `character.html` e `robotv.html` correspondem aos seus payloads Base64 atuais na branch #19. Isso é uma proteção útil, mas obriga a sincronização manual e torna revisão/manutenção mais propensas a erro.

### 2.2 Integração e acoplamento

O shell injeta lógica por `addAndroidExportAdapter`, que faz substituições textuais e adiciona persistência, adaptador de exportação e painel `NyraModelIO`/DSL ao Criador. Esse método atende à integração atual, mas combina responsabilidades e depende de marcadores/nome de funções internas do editor.

A correção recente do handshake do importador é um passo correto: o shell agora aguarda `NYRA_CHARACTER_IMPORT_READY`, mantém fila e timeout para imports recebidos do RoboTV. A prontidão é anunciada pelo Criador depois de registrar o listener. Isso reduz a corrida de inicialização observada por inspeção, mas não prova que a importação de arquivos concretos conclui com sucesso no Android.

### 2.3 Android nativo

`MainActivity.java` tem 403 linhas/17 KB e mantém responsabilidades de WebView, AssetLoader, seleção SAF/documentos, logs, ponte JavaScript e transferência de exportações em blocos. A API JavaScript expõe quatro operações de exportação: início, anexar bloco, finalizar e cancelar. Há limite de 256 MiB. A camada nativa é necessária para integração com arquivos e ciclo de vida; não há justificativa observada para converter o renderizador 3D inteiro em UI nativa.

### 2.4 Dependências offline

Three.js e JSZip são preparadas no Gradle, com versões/hash pinados e incluídos no APK. O aplicativo pretende funcionar offline em runtime. A tarefa de preparação ainda utiliza rede/npm no build; a possibilidade de cache/vendor determinístico é uma melhoria de processo, não uma razão para reescrever os editores.

## 3. Matriz de capacidades e problemas

| Área | Existe no código | Problema relatado/risco | Próxima verificação |
|---|---|---|---|
| Oficina de Itens / Pixel Lab | grade 16/32/64/128, cor, borracha, reset, PNG, JSON, MCAddon; handlers Pointer e Touch recentes | usuário não consegue pintar nenhum pixel | executar gesto real na grade, verificar hit-test, mudança da matriz/canvas, persistência, PNG/JSON |
| Criador de Personagens | Three.js, OrbitControls, TransformControls, formas, voxel, HSL, undo, BBModel, exportadores inseridos pelo shell, DSL | interface confusa; associação direta entre peças ausente; divergência entre HTML independente e adaptador | separar ferramentas por contexto sem categorias rígidas; implementar associação pai/filho; validar seleção, escopo e operação |
| RoboTV | viewport, árvore dinâmica, seleção, move/rotate/scale, associação, undo, transfer, clips, GLB/JSON/BBModel export | somente um JSON específico do robô importou segundo usuário; seletor visível só .bbmodel/.json | testar arquivos reais usados pelo usuário e fluxo completo via shell; inventariar capacidade por formato e animação |
| Shell/Android | iframes, file chooser, bridge, persistência local, diagnósticos, runtime offline | código agregado e acoplado; inicialização e transferências assíncronas | formalizar contrato de editor, estado de prontidão, erro, import/export e ciclo de vida |
| Persistência | rascunhos locais separados por editor | não comprovado cold-start/force-stop/recuperação completa; BBModel no Criador pede reimport para recuperar textura/metadados completos | projeto versionado com assets, recuperação e avisos de recuperação parcial |
| Bedrock | conversor/exportação em branch/PR #17 | recursos/formatos têm limitações explicitadas | manter trabalho na Frente D isolado até autorização; não misturar com este plano |

## 4. Importação e exportação — manter as oficinas independentes

O objetivo não é compartilhar projetos, cenas ou uma infraestrutura de modelos entre as três oficinas. Cada oficina continua com seu próprio propósito, seus próprios dados e seus próprios fluxos de trabalho.

O que deve ser consistente é a disponibilidade e o funcionamento dos comandos de importar/exportar dentro de cada oficina, respeitando o que aquela oficina sabe fazer.

- **Oficina de Itens:** importa/exporta os recursos próprios de criação de ícones/texturas para Minecraft Bedrock. A grade é apenas uma superfície de edição; a imagem exportada deve conter somente os pixels desenhados, sem grade, guias ou elementos da interface.
- **Criador de Personagens:** importa e exporta os formatos que consegue editar como personagem, preservando as peças, formas, hierarquia, materiais e demais propriedades que o formato comporta. A associação de peças deve acontecer dentro desta oficina.
- **RoboTV:** deve ter seu próprio botão e fluxo de importação para carregar modelos diretamente na oficina de animação. Os formatos oferecidos precisam ser realmente suportados pelo carregador e pela edição do RoboTV. A importação deve preservar a geometria e, quando presentes e suportadas, as animações, sem encaminhar o usuário a outra oficina para concluir a operação.

O RoboTV atual declara `.bbmodel` e `.json` no seletor e encaminha a importação ao Criador por `postMessage`. A presença de GLTFLoader no código não prova que GLB/glTF estejam conectados ao botão. A evolução deve acrescentar e testar os fluxos necessários diretamente no RoboTV, sem transformar as oficinas em um único editor nem exigir um formato universal.

A regra de aceitação para cada formato deve ser explícita: o arquivo abre, a geometria aparece, a estrutura necessária permanece e as animações são mantidas quando o formato e o importador as suportam. Se alguma propriedade não puder ser preservada, a oficina deve informar isso em vez de declarar sucesso completo.

## 5. Interface e experiência — direção recomendada

Não impor uma barra rígida com categorias como “Transformação”. Para o Criador, adotar uma superfície de ferramentas genérica:
- comandos essenciais (selecionar, criar, mover, girar, escalar, associar) podem permanecer visíveis quando houver espaço;
- em telas estreitas, os comandos menos frequentes podem ser representados por ícones com rótulos acessíveis/tooltip, sem esconder a ferramenta ativa;
- os controles específicos da ferramenta selecionada aparecem em um painel contextual;
- a peça selecionada, o pai, o escopo de pintura e o estado da ferramenta precisam ficar visíveis.

A Oficina de Itens deve permanecer simples e focada em desenhar ícones/texturas. A grade ajuda a posicionar pixels, mas não é parte do resultado exportado. A interface de animação deve priorizar viewport, seleção de modelo, hierarquia necessária e controles de animação, sem herdar a organização do Criador quando ela não fizer sentido.

A hierarquia visual deve distinguir ação primária, secundária, destrutiva e contextual. O objetivo é reduzir ambiguidade e deslocamento vertical, sobretudo no celular, sem padronizar à força ferramentas que têm finalidades diferentes.

## 6. Simplificação técnica — manutenção, não objetivo de produto

A proposta de simplificar a arquitetura não significa unificar as oficinas, compartilhar projetos ou criar uma camada de modelo universal. Significa apenas tornar o código mais fácil de corrigir e manter.

Exemplo concreto: o shell atual guarda três páginas em Base64 dentro de `index.html` e injeta parte dos recursos do Criador por substituições de texto. Isso aumenta o risco de uma correção ser aplicada em uma versão e não na outra. Uma melhoria possível, em momento adequado, é manter os arquivos dos editores separados e fazer o shell carregá-los diretamente.

Isso é uma tarefa técnica de manutenção, não uma etapa obrigatória antes de corrigir os problemas que o usuário relatou. Não deve atrasar a pintura, a edição de personagens nem a importação/animação no RoboTV.

Também não é necessário criar um formato universal de projeto. Cada oficina pode manter seus próprios formatos, dados e recursos. Reutilizar uma rotina interna de seleção de arquivo ou validação, quando fizer sentido, não altera essa independência.

## 7. Roadmap sugerido — ordem de dependência

### P0 — Fazer as ferramentas funcionarem
- Oficina de Itens: corrigir a pintura real em 16/32/64/128, matriz, preview, PNG/JSON e reset; confirmar que a exportação da imagem não inclui a grade.
- RoboTV: fazer o botão importar abrir os formatos efetivamente suportados pela oficina e validar modelos reais, geometria e animações.
- Criador: verificar operações básicas de seleção, criação, transformação, cores e edição relatadas no aparelho.
- Manter issue #11 aberta até reteste físico no mesmo dispositivo.

### P1 — Melhorar o Criador de Personagens
- Implementar associação entre peças diretamente no Criador, preservando posição no mundo, histórico e prevenção de ciclos.
- Reorganizar os controles com ferramenta genérica/contextual, sem categorias rígidas impostas.
- Melhorar a organização da árvore e a distinção entre selecionar uma peça, um grupo ou o personagem.

### P2 — Completar importação e exportação em cada oficina
- Garantir que cada oficina tenha seus próprios botões e fluxos de importar/exportar, adequados à sua finalidade.
- No RoboTV, oferecer os formatos que o próprio editor consegue carregar e animar, com preservação de geometria e animações suportadas.
- No Criador, manter importação/exportação de personagem e associação de peças.
- Na Oficina de Itens, manter a exportação limpa do ícone/textura, sem grade ou elementos de edição.
- Testar cada fluxo separadamente. Não criar projeto universal nem transferência obrigatória entre oficinas.

### P3 — Manutenção técnica gradual
- Se isso ajudar a manutenção, extrair os documentos HTML Base64 para arquivos separados sem mudar o comportamento.
- Reduzir dependência de substituições textuais e tornar os pontos de integração explícitos.
- Fazer essas mudanças em pequenas etapas, sem bloquear P0–P2 e sem alterar a finalidade independente das oficinas.

A Frente B permanece fora deste roadmap de implementação: ela exige planejamento próprio e deve continuar sendo tratada no contexto específico da Frente B. Não é uma etapa automática desta evolução.

## 8. Como medir sucesso

- **Oficina de Itens:** pintar em todas as resoluções; pixels refletidos na matriz/canvas/PNG; exportação sem grade, guias ou interface.
- **Criador:** criar, selecionar, associar, transformar e recolorir peças sem afetar outras peças indevidamente.
- **RoboTV:** importar modelos de cada formato anunciado, preservar geometria e hierarquia relevante, listar/reproduzir animações compatíveis e informar perdas quando existirem.
- **Experiência móvel:** clareza do estado da ferramenta, controles visíveis e quantidade de rolagem necessária em retrato e paisagem.
- **Confiabilidade:** APK ligado ao SHA exato, testes executados e validação física separada de CI.

## 9. Limitações e decisões

- As capturas do usuário demonstram divergência visual entre páginas, mas não permitem inferir comportamento de todo o código.
- A revisão do código não substitui teste no WebView Android real.
- As auditorias de Pixel Lab e ponte RoboTV recentes validam markers/fluxo estrutural e sintaxe; não simulam a interação física nem arquivos privados não fornecidos.
- A PR #19 tem base diferente da PR #16; a consolidação deve ser planejada, não feita por merge automático.
- A Frente D e `main` permanecem intocadas.
- A associação no Criador, o redesenho geral e a prova de importação pelo RoboTV permanecem pendentes.

## 10. Fontes internas verificadas

- PR #16 — auditoria integral: https://github.com/SirAlvin9266/nyra-android/pull/16
- PR #17 — exportação Bedrock: https://github.com/SirAlvin9266/nyra-android/pull/17
- PR #19 — hierarquia dinâmica RoboTV: https://github.com/SirAlvin9266/nyra-android/pull/19
- Issue #11 — validação física: https://github.com/SirAlvin9266/nyra-android/issues/11
- Issue #18 — integração RoboTV: https://github.com/SirAlvin9266/nyra-android/issues/18
- Issue #20 — preparação Frente B: https://github.com/SirAlvin9266/nyra-android/issues/20
- Issue #21 — interface/associação do Criador: https://github.com/SirAlvin9266/nyra-android/issues/21
