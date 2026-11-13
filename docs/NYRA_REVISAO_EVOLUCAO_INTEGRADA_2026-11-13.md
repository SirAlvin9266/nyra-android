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

## 4. Achados específicos de importação

O Criador independente aceita `.bbmodel` e `.json`. O painel `NyraModelIO` injetado pelo shell oferece `.glb`, `.gltf`, `.obj`, `.fbx`, `.stl`, `.bbmodel`, arquivos auxiliares e formatos de exportação GLB/OBJ/STL. Essa diferença explica por que duas telas/capturas podem mostrar opções distintas: são camadas de interface diferentes.

O RoboTV atual declara no seletor de arquivo `.bbmodel` e `.json`, e delega a interpretação ao Criador por `postMessage`. Não declara importação direta de GLB/glTF/OBJ/FBX/STL pelo seletor do RoboTV. O fato de a tela ter GLTFLoader não significa que todos os formatos estejam conectados ao botão de importação.

O importador Blockbench testado por script cobre cubos, grupos, mesh livre, UV/textura e clips de animação em fixtures sintéticas e no modelo Spartan shield. Esse teste é valioso, mas o cenário de importação integrado no Android ainda precisa testar:
1. arquivo aberto diretamente no Criador;
2. o mesmo arquivo encaminhado pelo RoboTV;
3. modelo carregado no viewport;
4. hierarquia, pivôs e materiais;
5. animações listadas e reproduzíveis quando o arquivo contém clips;
6. exportação/reabertura, com perdas e incompatibilidades reportadas.

A recomendação é não duplicar parsers. Um serviço compartilhado de importação deve ser chamado pelo Criador e pelo RoboTV, com capacidades por formato e diagnósticos explícitos.

## 5. Interface e experiência — direção recomendada

Não impor uma barra rígida com categorias como “Transformação”. Para o Criador, adotar uma superfície de ferramentas genérica:
- comandos essenciais (selecionar, criar, mover, girar, escalar, associar) podem permanecer visíveis quando houver espaço;
- em telas estreitas, os comandos menos frequentes podem ser representados por ícones com rótulos acessíveis/tooltip, sem esconder a ferramenta ativa;
- os controles específicos da ferramenta selecionada aparecem em um painel contextual;
- a peça selecionada, o pai, o escopo de pintura e o estado da ferramenta precisam ficar visíveis;
- materiais/cores usam o mesmo sistema de estado e seletor nos editores, preservando o domínio de cada editor.

A hierarquia visual deve distinguir ação primária, secundária, destrutiva e contextual. Não basta trocar cores dos botões; o objetivo é reduzir ambiguidade, botões simultâneos e deslocamento vertical, sobretudo no celular.

## 6. Problemas estruturais prioritários

1. **Base64 e geração dinâmica do editor:** mover gradualmente os documentos fonte para arquivos reais sob `assets/www/editors/`, primeiro sem alterações comportamentais; mudar o shell para carregar arquivos locais e testar módulos sob WebViewAssetLoader.
2. **Adaptador monolítico:** retirar, em etapas, o template `NyraModelIO` e persistência injetada de strings; criar módulos explícitos para I/O, DSL, persistência e ponte de editor.
3. **Contrato entre editores:** definir versão e mensagens públicas para `ready`, `importModel`, `sceneTransfer`, `exportModel`, `save/restore`, seleção e erros. O shell deve conhecer apenas capacidades públicas, não DOM/funções privadas.
4. **Persistência:** consolidar num serviço versionado de projeto, distinguindo rascunho recuperável de projeto completo com assets binários/referências externas. Manter migração dos dados atuais.
5. **Android nativo:** manter Activity como composição/ciclo de vida; considerar classes separadas para host WebView, document picker, transfer manager e logger quando forem mudanças isoladas e testáveis.
6. **Testes:** separar sintaxe/estrutura, testes de domínio, testes com DOM/canvas simulado, teste integrado WebView e validação física. CI estático não pode exibir “pintura passou” como se o toque físico fosse validado.

## 7. Roadmap sugerido — ordem de dependência

### P0 — Confiabilidade básica
- Pixel Lab: reproduzir e corrigir pintura real em 16/32/64/128, matriz, preview, PNG, JSON e reset.
- RoboTV: validar handshake recente com múltiplos arquivos .bbmodel reais e JSON de projeto do Criador; apresentar erro de formato/capacidade sem falso sucesso.
- Criador: verificar erros funcionais relatados no aparelho e consertar operações básicas de seleção, criação, transformação e pintura.
- Manter issue #11 aberta até reteste físico no mesmo dispositivo.

### P1 — Criador como ambiente real de construção
- Implementar associação entre peças diretamente no Criador, preservando world transform, guardando histórico, impedindo ciclos e exibindo hierarquia.
- Reorganizar controles com ferramenta genérica/contextual, sem grupos rígidos impostos.
- Reduzir divergência entre HTML independente e interface injetada pelo shell.

### P2 — Interoperabilidade entre os três editores
- Unificar inventário de formatos e importação compartilhada.
- Permitir carregar modelos do Criador no RoboTV e preservar clips suportados.
- Diferenciar “arquivo reconhecido”, “geometria importada”, “textura preservada” e “animação reproduzível”.
- Testar round-trip com fixtures reais do projeto.

### P3 — Simplificação técnica
- Extrair HTML Base64 sem alterar comportamento.
- Migrar adapters e contratos por etapas.
- Consolidar persistência, notificações e diagnósticos.
- Revisar lifecycle/dispose de WebGL, listeners, iframes e objetos.

### P4 — Evolução da modelagem (Frente B)
- Só avançar após estabilizar os fluxos anteriores e a base do editor.
- Reusar DSL v1, scene-transfer v1 e conversor Bedrock existentes; não duplicar contratos.
- Preservar a Frente D congelada/isolada até decisão explícita.

## 8. Como medir sucesso

- Pixel: taxa de pintura bem-sucedida nas quatro resoluções; pixels refletidos na matriz/canvas/PNG e recuperados após reabrir.
- Criador: tempo/toques para criar, associar, transformar e recolorir uma peça sem afetar outras.
- Importação: sucesso por formato e preservação por propriedade (geometria, hierarquia, pivô, textura, clip).
- UX: quantidade de controles simultâneos, clareza do estado da ferramenta, rolagem necessária em retrato e paisagem.
- Integração: número de dependências privadas entre shell e editor; contratos versionados e testáveis.
- Performance: cold start, troca de editor, memória em modelos grandes, tempo de import/export.
- Distribuição: APK ligado ao SHA exato, hashes e lista de testes executados.

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
