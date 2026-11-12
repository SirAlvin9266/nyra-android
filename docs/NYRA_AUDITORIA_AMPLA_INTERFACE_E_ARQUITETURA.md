# Nyra 3D Studio — revisão ampla de interface, produto e arquitetura

**Base examinada:** `fix/nyra-startup-recovery-2026-11-10`, commit `bc5ee9992ca346f617389fd364e62903c63c7640`.
**Escopo:** inspeção estática do código versionado. Não equivale a teste visual no aparelho nem a inspeção do APK final.
**Proteção:** Frente D permanece congelada e intocada.

## 1. Síntese

O Nyra já reúne capacidades reais e distintas: edição pixelada de itens, criação de personagens 3D e ferramentas de animação. A base Android tem uma estratégia útil de execução offline, assets locais e exportação via seletor de documentos. O problema central não é a escolha de HTML por si só: é a forma como a interface e os serviços foram agregados, adaptados e mantidos.

A experiência externa tende a sofrer com a falta de um sistema de interface comum, com controles adicionados por adaptação ao documento do editor, e com diferentes padrões de organização entre editores. Internamente, a aplicação mistura apresentação, navegação, compatibilidade Android, persistência e importação/exportação em poucos arquivos e em trechos gerados dinamicamente.

A recomendação é uma evolução incremental: extrair os documentos originais para arquivos separados, criar um sistema de design compartilhado, transformar as integrações em módulos explícitos e manter o Android nativo como host/ponte de recursos de sistema. Não recomendamos reescrever tudo em Compose ou abandonar WebView antes de medir custos e benefícios.

## 2. O que foi efetivamente inspecionado

- Árvore de arquivos da base: 27 arquivos versionados na revisão escolhida.
- `index.html`: 206.536 caracteres; contém shell e os três documentos dos editores codificados em Base64.
- Payloads codificados: Oficina ~20,4 KB; Criador ~50,0 KB; RoboTV ~22,8 KB.
- Shell: navegação, criação/carregamento de iframe, zoom, modo desktop, guia, diagnóstico, persistência e adaptação Android.
- `addAndroidExportAdapter`: função que adapta HTML por substituições, injeta persistência, ponte de exportação e ferramentas de modelo.
- `MainActivity.java`: 17.065 caracteres/403 linhas; cria WebView, configura acesso a assets, trata logs, seletor de arquivos, exportação em blocos e ciclo de vida.
- `build.gradle.kts`: tarefa de obtenção e verificação de dependências Three.js/JSZip, empacotadas para uso offline.
- Manifesto e recursos de ícone Android.
- README, registro de integração e script de auditoria do APK.

**Não foi possível confirmar nesta inspeção a aparência em execução de todas as telas nem o APK exato instalado no aparelho.** A árvore consultada não forneceu um APK desta base. A avaliação visual abaixo distingue evidência do código e hipótese que exige teste físico.

## 3. Pontos positivos a preservar

1. Três editores especializados, com propósitos distintos; não é necessário forçá-los a virar uma única tela genérica.
2. Dependências principais empacotadas localmente, reduzindo dependência de rede em tempo de execução.
3. Ponte de exportação em blocos e uso do seletor nativo de documentos.
4. Persistência local já iniciada em todos os editores, ainda que adaptada de forma diferente.
5. Three.js e formatos de intercâmbio de modelos atendem a uma necessidade clara do produto.
6. Guia interativo e identidade visual já existem e podem ser refinados sem confundir o robô-guia com o runtime do editor 3D.
7. Testes de regressão para DSL, importação BBModel, adaptadores, pré-análise GLB e conteúdo do APK.

## 4. Diagnóstico externo — interface, botões e experiência

### 4.1 Falta de um sistema de design comum

O shell define botões globais simples. Os documentos internos têm suas próprias variáveis, cores, raios, espaçamentos, tipografia e estados. Os controles injetados pelo adaptador acrescentam outro conjunto de CSS. Isso cria pelo menos três fontes visuais: shell, documento de cada editor e componentes adicionados pelo adaptador.

**Efeito provável:** botões parecidos podem ter altura, peso, cor, foco, estado desabilitado e resposta diferentes. Ajustar o estilo global não garante consistência dentro dos iframes.

**Direção:** criar tokens comuns (cores semânticas, tipografia, espaçamento, bordas, elevação, foco, estados) e componentes reutilizáveis. Cada editor pode manter sua identidade, mas deve obedecer ao mesmo contrato de botões, campos, painéis, diálogos, mensagens e navegação.

### 4.2 Hierarquia de ações

Há ações primárias, secundárias, destrutivas e de navegação usando o mesmo elemento básico e diferenciação irregular por classe/estilo.

**Direção:** classificar cada ação em primária, secundária, terciária, destrutiva e estado. Não deixar a classe `active` servir ao mesmo tempo como seleção de aba e destaque visual genérico. Ícones devem ter rótulos ou dicas acessíveis; ícone sozinho só para ação universal e reconhecível.

### 4.3 Interface móvel e densidade

O shell aplica largura lógica fixa de 1280 px no modo desktop e escala por zoom; os editores ainda possuem seus próprios breakpoints e mínimos de tamanho. Há também altura mínima de 600 px para iframe em telas pequenas.

**Risco a testar:** o usuário pode precisar alternar modos/zoom para alcançar controles, com efeitos colaterais em rolagem, alvos de toque, menus, canvas e painéis. A estratégia desktop-scaled deve ser um modo de compatibilidade, não a principal solução responsiva.

**Direção:** layout mobile-first com painéis empilháveis, barras de ferramentas adaptáveis, ações principais sempre visíveis, áreas de canvas com altura calculada e controles de toque dimensionados. Testar em celular estreito, celular largo e tablet, retrato e paisagem.

### 4.4 Consistência de navegação

O shell escolhe o editor por botões de navegação; cada editor também possui navegação, abas e controles próprios. O guia troca de editor e destaca alvos. Isso exige contrato claro entre shell e editor.

**Direção:** navegação superior única e coerente; cada editor conserva navegação local só para seus modos/ferramentas. Padronizar botão de voltar, mudança de editor, confirmação de saída quando houver trabalho não salvo e retorno à posição/estado anterior.

### 4.5 Feedback e estados

O shell tem uma linha global de mensagem e diagnóstico de prontidão. O código de exportação usa `alert()` em alguns erros; Android exibe Toasts. Os editores mantêm seus próprios status. Esses canais podem competir.

**Direção:** sistema único de notificações com níveis (informação, sucesso, aviso, erro), mensagens inline para validação, progresso para operações longas, e diagnóstico detalhado separado. Não usar alert modal para falhas comuns.

### 4.6 Acessibilidade e ergonomia

A revisão estática identifica uso parcial de `aria-label`, `aria-live` e estados de botão, mas não comprova navegação por teclado/leitor de tela. Em canvas 3D e ferramentas de arrastar, deve haver alternativas para seleção e transformação.

**Direção:** foco visível, rótulos associados, ordem de tabulação previsível, alvos de toque adequados, contraste de estados e alternativa numérica para operações espaciais.

## 5. Diagnóstico interno — arquitetura e manutenção

### 5.1 Um único arquivo funciona como aplicativo inteiro

O arquivo HTML principal armazena documentos completos dos editores como Base64 e também contém o runtime de integração. O custo não é apenas tamanho: a estrutura fica invisível para ferramentas comuns, revisões de código e testes; uma alteração pode precisar decodificar e re-embutir conteúdo.

**Melhoria de alto retorno:** mover cada documento para arquivos HTML próprios em `assets/www/editors/`; mover CSS/JS para arquivos próprios quando houver fronteira real; manter shell pequeno e explícito.

### 5.2 Adaptador como gerador de código e ponto de acoplamento

`addAndroidExportAdapter` altera HTML por `replace`, injeta scripts de persistência, expõe objetos internos do editor, cria ferramentas e injeta controles de importação/exportação. Parte da integração depende de marcadores textuais e nomes internos específicos dos editores.

**Risco:** mudança no editor pode quebrar adaptação silenciosamente; a ordem de inicialização fica implícita; rastrear erros é difícil; testes precisam conhecer detalhes privados dos documentos.

**Melhoria:** contrato de integração por editor, por exemplo `NyraEditorBridge`, com capacidades explícitas: `ready`, `getProject`, `restoreProject`, `importModel`, `exportModel`, `getSelection`, `subscribe`. Adaptadores isolados e testados por editor, sem reescrever HTML em tempo de execução quando se puder importar módulo diretamente.

### 5.3 Persistência duplicada e heterogênea

Oficina, Criador e RoboTV recebem lógicas de persistência distintas via strings. O Criador trata BBModel especialmente e pode registrar que um arquivo deve ser reimportado para recuperar metadados/texturas completos.

**Melhoria:** serviço de projetos com versão de esquema, autosave com debounce, migração explícita, limites de tamanho e política para assets externos. Separar rascunho leve de pacote de projeto completo. Preservar dados não suportados e avisar quando a recuperação for parcial.

### 5.4 Responsabilidades da MainActivity

A Activity gerencia criação/configuração de WebView, logs, file chooser, downloads HTTP, bridge de exportação, fila de documentos, cópia de arquivos e limpeza. Há concentração, embora algumas dessas responsabilidades pertençam legitimamente ao host Android.

**Melhoria:** separar em componentes pequenos e testáveis: `NyraWebViewHost`, `DocumentPickerGateway`, `ExportTransferManager`, `WebConsoleLogger`. A Activity fica responsável por ciclo de vida e composição. Não há razão demonstrada para migrar a interface de edição 3D para Compose.

### 5.5 Comunicação Java ↔ JavaScript

A ponte oferece métodos de exportação chamados pelo JavaScript. É uma fronteira de confiança e de compatibilidade crítica.

**Melhoria:** API pequena, versionada, com validação de parâmetros, limites, estados e erros estruturados; chamadas assíncronas quando apropriado; sem expor métodos nativos desnecessários. Documentar quais origens e frames podem chamar a ponte, especialmente porque existem iframes sandboxed.

### 5.6 Dependências e build

A tarefa Gradle baixa pacotes npm durante o build e verifica hashes antes de copiar arquivos. Isso é bom para integridade, mas faz o build depender de rede e de ferramenta npm mesmo que o APK seja offline.

**Direção:** preservar pinagem e hashes; considerar vendor versionado ou cache controlado para builds reproduzíveis/offline. Evitar incluir módulos não usados. A decisão exige conferir imports reais de todos os editores.

### 5.7 Estado, eventos e acoplamento

O shell controla editor ativo, iframe, zoom, desktop mode, guia, localStorage e mensagens. O adapter injeta wrappers em funções globais e ouve eventos genéricos de documento. Esse padrão é conveniente para integrar legado, mas pode capturar ações irrelevantes ou salvar estado muitas vezes.

**Melhoria:** eventos explícitos de domínio e API por editor; evitar monkey-patching de funções e captura genérica de todo clique quando os pontos reais de alteração são conhecidos.

## 6. Recomposição proposta

### Camada Android
- `MainActivity`: ciclo de vida e composição.
- `web/NyraWebViewHost`: configura WebView, AssetLoader e política de navegação.
- `files/DocumentPickerGateway`: importação e permissões URI.
- `files/ExportTransferManager`: exportação em blocos e fila de salvamento.
- `diagnostics/WebConsoleLogger`: logs e captura de falhas.

### Web shell
- `shell/index.html`: estrutura mínima.
- `shell/app.js`: navegação, estado global e lifecycle dos editores.
- `shell/app.css`: layout e tokens.
- `shared/design-tokens.css`: cores, espaçamento, tipografia, foco e estados.
- `shared/components.css` + módulos JS: botões, campos, painéis, modais, toast, tooltips e menus.
- `shared/project-service.js`: persistência, versionamento, migração.
- `shared/android-bridge.js`: contrato tipado da ponte e fallback web.

### Editores
- `editors/items/index.html`, `items.css`, `items.js`.
- `editors/character/index.html`, `character.css`, módulos de cena, árvore, transformações, importação e exportação.
- `editors/animation/index.html`, `animation.css`, timeline, rig, keyframes e playback.
- `editors/*/android-adapter.js`: integração específica e mínima, só onde realmente necessária.

Compartilhar apresentação e infraestrutura; não forçar os três domínios a compartilhar lógica de edição. Criar módulos por responsabilidade estável, não um arquivo para cada função.

## 7. Plano de execução seguro

1. **Inventário de referência:** congelar a base e registrar screenshots/fluxos do APK instalado; coletar dimensões, erros e desempenho.
2. **Extrair sem alterar:** tirar os três HTML da Base64 e armazenar como arquivos normais; testar que os bytes/conteúdo decodificado são equivalentes.
3. **Sistema de design:** definir tokens e estados; aplicar primeiro no shell e nos controles injetados; depois harmonizar editores.
4. **Contrato por editor:** substituir gradualmente os `replace` e wrappers implícitos por APIs formais; manter adaptador legado temporário.
5. **Serviços compartilhados:** persistência/projeto, notificações, importação/exportação, bridge e logs.
6. **UX por editor:** revisar tarefas principais, densidade, barras de ferramentas, painéis, menus, atalhos e touch.
7. **Android nativo seletivo:** melhorar seletor, compartilhamento, back, estado de ciclo de vida e telas nativas apenas onde isso melhora integração do sistema.
8. **Limpeza:** retirar adaptadores antigos, CSS duplicado e caminhos mortos apenas após comparação de comportamento e testes.
9. **Validação:** CI, APK identificado por hash do commit, testes em dispositivos reais e regressão dos projetos enviados.

## 8. Métricas para saber se melhorou

- Tempo e toques para iniciar cada tarefa principal.
- Quantidade de padrões diferentes de botão/campo/painel por editor.
- Percentual de controles acessíveis sem modo desktop/zoom especial.
- Tempo de inicialização e troca de editor.
- Memória ao abrir modelo simples e GLB grande.
- Tamanho e complexidade do shell versus módulos.
- Número de pontos de integração internos por editor.
- Taxa de sucesso de importação/exportação e restauração de rascunho.
- Erros JavaScript/Android por sessão.

## 9. Decisões recomendadas

- **Manter HTML/CSS/JS** para as áreas complexas de edição e renderização 3D.
- **Manter Android nativo** para ciclo de vida, arquivos, permissões, compartilhamento, armazenamento e recursos de sistema.
- **Remover Base64 de documentos inteiros** e a necessidade de modificá-los por substituições frágeis em strings.
- **Criar design system compartilhado** antes de redesenhar botões individualmente.
- **Não migrar tudo para Compose**: isso mudaria a tecnologia sem resolver por si só domínio, estado, importação e renderização.
- **Não reorganizar apenas para aumentar o número de arquivos**: modularizar por responsabilidade e fronteira testável.
- **Não alterar funcionalidades 3D e formatos** como parte de uma reforma visual sem testes de equivalência.

## 10. Limites desta auditoria

Esta análise foi feita a partir dos arquivos versionados na branch de recuperação e de leitura estática. Não foi possível inspecionar o APK instalado, medir performance real, observar renderização e navegação em aparelho, ou validar cada botão com toque. Esses itens permanecem explicitamente pendentes e não devem ser apresentados como problemas comprovados. A próxima etapa de validação visual precisa usar um APK construído do commit identificado e capturas de telas/fluxos do aparelho.