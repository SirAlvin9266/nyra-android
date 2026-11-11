# Nyra — Auditoria geral do aplicativo (fora da Frente D)

**Branch:** `work/nyra-application-audit`
**Baseline:** `fix/nyra-startup-recovery-2026-11-10`
**Escopo:** auditoria de regressões e funcionamento geral. Frente D explicitamente congelada e fora deste trabalho.

## 1. Proteção de escopo
- Não alterar `main`.
- Não mesclar PRs existentes.
- Não editar a branch ou PR da Frente D (#15).
- Não desenvolver integração 3D/Bedrock nesta auditoria.
- Registrar problemas e evidências antes de executar correções.
- Trabalhar apenas nesta branch isolada.

## 2. Arquitetura observada
O APK carrega um shell HTML que contém três documentos HTML codificados em Base64 (`items`, `character`, `animation`) e os abre em iframes por `srcdoc`. O shell acrescenta adaptadores Android para dependências locais, persistência, comunicação de exportação e diagnóstico. Duas camadas precisam ser auditadas separadamente:
1. documentos originais dos editores;
2. shell/adaptações Android e comunicação com a Activity nativa.

O shell atual declara preparação eager dos três iframes, alternância por navegação, zoom geral, modo desktop e Guia Interativo.

## 3. Funcionalidades identificadas

### 3.1 Oficina de Itens / Pixel Lab
- Matriz pixelada com resoluções 16, 32, 64 e 128.
- Paletas e designs pré-definidos, além de item vazio.
- Pintura por clique/toque usando `pointerdown`.
- Borracha, restaurar desenho e alternância da grade.
- Prévia ampliada e mapa conceitual de faces.
- Exportação PNG, matriz JSON e pacote inicial `.mcaddon`.
- Persistência local adicionada pelo adaptador Android.

Limitações declaradas na própria interface:
- PNGs e matrizes ainda não estão conectados ao modelo 3D do RoboTV.
- `.mcaddon` é pacote inicial/de teste, não um modelo completo de jogador.
- O texto de erro do compactador JSZip pede conexão; a adaptação Android deve carregar a biblioteca de asset local.

**Relato físico:** usuário não consegue pintar na grade. A inspeção estática identificou um evento `pointerdown` ligado a `editPixel`, sem tratamento de `pointermove` no payload original. Isso confirma ausência de pintura contínua por arraste; não prova a causa do toque isolado falhar. Precisamos investigar coordenadas do canvas, retângulo CSS, eventos no WebView, sobreposição, captura de ponteiro e CSS.

### 3.2 Criador de Personagens
- Cena Three.js, OrbitControls e TransformControls.
- Seleção de parte, ajuste de cor/HSL, dimensões, posição e transformações.
- Adição de cubo, esfera, cilindro e cone.
- Ferramentas voxel: selecionar/editar, adicionar blocos e apagar blocos.
- Exclusão e desfazer até 50 ações.
- Importar/exportar JSON de personagem e importar/exportar BBModel no documento de referência.
- Adaptadores Android acrescentam importadores/exportadores 3D, seleção de hierarquia e persistência.

Limitações explicitamente visíveis no payload original:
- Modelo de demonstração permanece interno e não pode ser inserido por botões na etapa descrita.
- Transferência direta para RoboTV e exportação Bedrock aparecem como pendentes no payload original do baseline.

**Relatos físicos:** problemas de fidelidade de modelos (escala/proporção, partes estranhas, textura ausente), alteração de cores afetando objetos não pretendidos e integração de transferência não confirmada. São relatos do usuário, ainda não conclusões independentes.

### 3.3 RoboTV / Animação
- Viewport Three.js e grade.
- Rig articulado fixo do personagem RoboTV.
- Seleção de seis articulações e rotação X/Y/Z.
- Poses rápidas, quadros-chave, duplicação/exclusão, timeline e reprodução.
- Controle de velocidade.
- Equipamentos visuais.
- Salvar no celular, exportar JSON, abrir JSON e exportar animação.
- Rascunho local Android na chave legada do RoboTV.

Limitação do payload original: opera sobre um conjunto fixo de articulações, não um documento genérico importado. O texto de dependência de internet do Three.js deve ser confrontado com import map e adaptador offline do shell.

### 3.4 Guia e shell
- Guia tem etapas para os três editores, alvos de destaque e controles anterior/próximo/fechar.
- Shell mantém três iframes, mensagens de estado, zoom geral, modo desktop e persistência do editor ativo.
- A identidade do Robô TV do Guia é separada do rig de animação.

## 4. Histórico e regressões potenciais
- A branch `fix/nyra-startup-recovery-2026-11-10` contém os mesmos hashes do HTML integrado, MainActivity, auditoria de referência e adaptadores que `main` na comparação efetuada. O PR #13 contém mudanças de workflow e documentação.
- PR #13 declara explicitamente pendentes pintura por toque/arraste, responsividade, fidelidade BBModel, integração do robô ao guia, clips/timeline e persistência integral.
- PR #14 altera o HTML do shell, mas mantém MainActivity e scripts de auditoria com os mesmos hashes do baseline de recuperação. Não será mesclado automaticamente.
- `fix/nyra-android-physical-test-findings` diverge muito do baseline e inclui alterações extensas em HTML, Activity nativa e auditorias. Não adotar sem revisão commit a commit.
- PR #8 reúne inventário de funcionalidades e testes físicos, mas está numa branch divergente. Seus documentos podem orientar a auditoria após revisão; não importar alterações automaticamente.
- PRs #5, #8, #12, #13 e #14 são fontes separadas de histórico/evidência.

## 5. Matriz inicial

| Sistema | Estado estático | Relato físico | Próxima verificação |
|---|---|---|---|
| Inicialização APK | Eager iframe dos 3 editores; adaptadores presentes | app abriu e navegou | erros por iframe, inicialização completa |
| Oficina: clique/toque | listener pointerdown existente | não pinta | evento, coordenadas, CSS/overlay |
| Oficina: arraste | sem pointermove no payload | não avaliado isoladamente | desenho contínuo |
| Oficina: paletas/borracha/reset | controles presentes | não confirmado | teste individual |
| Oficina: PNG/JSON | funções presentes | não confirmado | integridade e conteúdo dos arquivos |
| Oficina: MCAddon | JSZip mapeado localmente pelo shell | não confirmado | ZIP, estrutura e download Android |
| Criador: seleção | picking e selectedObject | editor abre | cor/transformação no alvo correto |
| Criador: geometria | ferramentas 3D e voxel presentes | modelos com diferenças | referência visual e transforms |
| Criador: persistência | rascunho Android | não confirmado | fechar/reabrir |
| Criador: importação | adapters e parser presentes | fidelidade problemática | fixtures e modelos originais |
| RoboTV: rig | controles/timeline presentes | editor abre | keyframes/reprodução/salvamento |
| RoboTV: JSON | botões e funções presentes | não aprovado | round-trip |
| Guia | conteúdo e navegação implementados | mascote ainda não aparece no aparelho | asset e seleção do Guia |
| Shell Android | file chooser e export bridge | navegação funcional | seletores, cancelamento e exportação |

## 6. Plano de investigação da Oficina (sem correção aplicada)
A primeira regressão deve testar:
- canto superior esquerdo, centro e canto inferior direito;
- canvas com tamanho CSS diferente da resolução interna;
- pointerType touch e mouse;
- pointercancel;
- limites fora da matriz;
- pintura por arraste;
- borracha e restauração;
- atualização da prévia/estatísticas;
- persistência e reabertura.

Não alterar o modelo de dados da pixel art nem integrar UV/3D nesta auditoria.

## 7. Itens pendentes para fechar auditoria estática
- [ ] Reproduzir as auditorias existentes do baseline e registrar saídas completas.
- [ ] Inspecionar handlers, IDs, callbacks sem consumidor e controles sem listener.
- [ ] Criar auditoria específica da Oficina para interação do canvas e limites da matriz.
- [ ] Auditar contrato entre adaptadores shell e API Java (file chooser/export chunks/persistência).
- [ ] Revisar PR #8 e PR #12 em detalhe, sem cherry-pick automático.
- [ ] Confirmar caminhos de dependência externa e runtime offline.
- [ ] Criar smoke tests para fluxos não dependentes de WebGL.
- [ ] Criar matriz de teste físico por editor e controle.

## 8. Critério de conclusão
A auditoria só será completa quando houver:
1. inventário dos editores e controles;
2. comparação de histórico e regressões plausíveis;
3. resultados automatizados reproduzidos no commit da branch;
4. lista priorizada com evidência e arquivos/funções envolvidos;
5. separação explícita entre revisão estática, teste automatizado e validação física.

**Status:** auditoria inicial documentada; nenhuma correção funcional aplicada. Frente D fora do escopo.
