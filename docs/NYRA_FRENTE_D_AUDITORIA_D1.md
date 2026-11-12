# Frente D — Auditoria D1 do código atual

**Branch de auditoria/implementação:** `work/nyra-frente-d-integration`  
**Base escolhida:** `fix/nyra-startup-recovery-2026-11-10`  
**Commit-base:** `bc5ee9992ca346f617389fd364e62903c63c7640`  
**Data do registro:** 11/11/2026  
**Estado:** auditoria estática inicial concluída; validação Android/WebView e Minecraft ainda não executada nesta etapa.

## 1. Decisão de base e proteção do trabalho existente

A Frente D será desenvolvida em branch isolada, partindo do baseline de recuperação que o registro do repositório identifica como a base conservadora de inicialização. A `main` não foi alterada. A PR #14 permanece separada: ela trata de seletor genérico de importação, dock de exportação no Criador de Personagens e guia, e seu escopo declara expressamente que não altera RoboTV, arquitetura de painéis, gerador matemático ou compatibilidade interna Bedrock.

Não mesclar PRs existentes como atalho para iniciar a Frente D. Antes de qualquer futura integração, revisar base/head e estado das PRs novamente.

## 2. Arquitetura de execução encontrada

O app Android atual incorpora três documentos HTML originais em Base64 no arquivo:

- `android/app/src/main/assets/www/index.html`

O shell contém uma navegação que troca os editores `items`, `character` e `animation` por meio de iframe gerado. Portanto, cada alteração em um editor embutido exige:
1. decodificar o payload correto;
2. alterar o HTML interno do editor;
3. reserializar o HTML como UTF-8/Base64;
4. atualizar a declaração `const pages` mantendo intactos os outros dois payloads;
5. executar as auditorias de referência e adaptadores que extraem os documentos finais.

Não editar o shell como se os documentos internos estivessem soltos no arquivo.

## 3. O que já existe

### 3.1 RoboTV / Animação atual

O payload `animation` contém:

- viewport Three.js com o robô articulado pré-definido;
- seleção das articulações existentes e controles de rotação por eixo;
- coleção local `frames`, cada quadro com `time` e `pose`;
- funções `getPose`, `setPose`, `interpolate`, `renderFrames`, `addFrame`, `playLoop` e `stopPlayback`;
- presets de poses;
- reprodução baseada nos quadros armazenados;
- exportação/importação JSON do projeto de animação;
- salvamento local sob a chave `nyra3d-robotv-project`.

**Limitação concreta:** o formato atual grava poses de um conjunto fixo de articulações do robô. A função `projectData()` serializa o nome fixo `RoboTV-blocky`, a pose e os `frames`. Não há evidência, no payload auditado, de uma árvore genérica de bones importados, canais por UUID de nó ou associação de clips Blockbench com a timeline existente.

### 3.2 Criador de Personagens / Blockbench

O payload `character` contém:

- seletor `.bbmodel/.json`;
- parser de Blockbench implementado no módulo `NyraModelIO` e exposto pelo bridge `window.__nyraParseBBModel`;
- importador `importBBModelFile(file)`;
- construção de cubos e malhas livres;
- importação de grupos/outliner e pivôs;
- mapeamento de canais de animação compatíveis para `THREE.AnimationClip`;
- estado `bbmodelState`, que mantém `rawData`, raiz, registros e grupos;
- exportador .bbmodel que parte de uma cópia de `rawData` e aplica transformações editadas aos elementos compatíveis;
- status da importação que informa quantidade de peças, grupos, animações e texturas.

O teste `android/scripts/audit_bbmodel_import.cjs` executa o parser real extraído do módulo e contém fixtures sintéticas de cubos/animação, malhas livres, textura externa e Hytale, além da fixture real do escudo.

**Limitação concreta:** a presença de `parsed.animations` e sua contagem no status de importação não prova que os clips sejam enviados ao payload RoboTV. O estado e o viewport do Criador de Personagens são locais a esse editor.

### 3.3 DSL matemático atual

O documento `NYRA_MODEL_DSL.md` e o teste `android/scripts/audit_model_dsl.cjs` confirmam DSL v1 com `group`, `box`, `sphere`, `cylinder` e `cone`, posição/rotação/escala/pivô, validação de hierarquia e limite de 500 componentes.

O teste confirma os tipos geométricos como construtores Three.js. O DSL atual não cria cubos Blockbench nativos, bones/esqueleto, texturas pintadas ou UV customizado. Ainda não é uma autoria Bedrock-aware.

## 4. Lacunas principais confirmadas

| Capacidade da Frente D | Situação encontrada |
|---|---|
| Detector explícito de formato/destino Bedrock Entity | Não comprovado no fluxo atual |
| Documento canônico compartilhado entre os três editores | Não encontrado; cada editor mantém seu estado/rascunho |
| Preservação de dados BBModel desconhecidos | `rawData` é retido no estado do Criador, mas cobertura de ida/volta precisa de teste |
| Integração de clips BBModel à timeline RoboTV | Não encontrada |
| Timeline genérica por osso/nó e canais position/rotation/scale | Não encontrada no RoboTV atual |
| Motor de avaliação de pose por hierarquia genérica | RoboTV atual interpola poses do rig fixo |
| Comandos importar/exportar dentro do próprio RoboTV | Não encontrados no payload de animação atual |
| DSL com perfil `bedrock_entity` e geração de bones/cubos Bedrock | Ausente na especificação/teste DSL v1 |
| Exportador geometry Bedrock versionado | Não encontrado |
| Exportador animations Bedrock e ligações client_entity | Não encontrados |
| Resource Pack independente de entidade com geometry + texture + animation | Não encontrado no fluxo de personagem; o Pixel Lab gera pacote de item de teste separado |
| Validação em Minecraft Bedrock | Pendente nos registros do projeto |

## 5. Testes e automação já existentes

O workflow `.github/workflows/android-build.yml` executa:
- auditoria estrutural dos payloads originais;
- auditoria dos adaptadores Android;
- teste DSL matemático;
- teste do parser Blockbench;
- pré-análise estrutural GLB;
- build Gradle do APK;
- inspeção de assets locais no APK.

O workflow não executa smoke test de WebView/Android instrumentado nem validação no Minecraft Bedrock. A execução mais recente da branch de recuperação consultada foi bem-sucedida no CI da PR #13; isso comprova o pipeline automatizado daquele commit, não a nova branch D nem a interação física.

## 6. Decisões de implementação derivadas da auditoria

1. Manter o rig fixo e o fluxo atual do RoboTV funcionando enquanto se adiciona um modo de projeto genérico. Não substituir o robô atual por uma arquitetura incompleta.
2. Extrair do importador uma camada de dados independente do Three.js para tornar possível enviar a estrutura importada ao RoboTV sem compartilhar objetos WebGL entre iframes.
3. Definir um formato de transferência versionado entre Character Editor e RoboTV. Deve incluir árvore, IDs/UUIDs, nomes, pivôs, transforms de base, geometria referenciada/serializável e clips com canais/keyframes.
4. Primeira integração funcional: importar no Criador um `.bbmodel` com animações e encaminhar para RoboTV um pacote de projeto serializável; RoboTV deve reconstruir hierarquia/rig e exibir os clips importados. Não colapsar os clips em uma única pose.
5. A timeline genérica inicial deve suportar canais de rotação com base em clips convertidos já reconhecidos, mas reter o payload bruto de canais ainda não reproduzidos.
6. Os controles de importar/exportar devem ser adicionados no payload interno `animation`, dentro do painel RoboTV.
7. Só depois da integração e dos testes de ida/volta avançar para DSL Bedrock-aware e exportadores Bedrock.

## 7. Próxima sequência executável

- **D1 concluída como auditoria estática inicial:** mapa acima e branch isolada criada.
- **D1.1:** executar as auditorias disponíveis no commit-base exato e registrar resultados.
- **D2:** fechar o contrato de dados compartilhado/transferência entre editores, sem exigir mover imediatamente todo o estado legado.
- **D3:** conectar importação BBModel e clips ao fluxo RoboTV.
- **D4:** expandir timeline genérica e controles de importação/exportação dentro do RoboTV.
- **D5+:** DSL Bedrock-aware, geometry exporter, animation exporter, client entity e empacotador, conforme o plano técnico detalhado.

## 8. Integração D2/D3 — estado implementado na branch de trabalho

A branch `work/nyra-frente-d-integration` agora contém uma primeira fatia funcional de integração Character Editor → host → RoboTV:

- Contrato JSON versionado `nyra.scene-transfer` v1 e validador independente com checagem de IDs, hierarquia, ciclos, transforms, canais e serialização.
- O Criador de Personagens converte o `rawData` do Blockbench em nós com grupos/bones, cubos/malhas, relações pai-filho, transforms locais, pivôs, faces/UVs, texturas, clips e canais. Os dados brutos originais permanecem em `extensions.blockbenchRaw` e em `sourceData`.
- O host roteia mensagens entre os iframes, restringe a origem do produtor/destino e devolve confirmação ao editor de origem.
- O RoboTV ganhou importação de `.bbmodel` dentro do próprio painel, árvore de nós, seleção/reprodução de clips, parada/restauração da pose, exportação do documento Nyra JSON e exportação GLB.
- Quando a geração GLB é possível, o RoboTV usa o GLB para visualizar materiais, UVs e animações compatíveis. Se não for possível, há reconstrução estrutural simplificada; os dados completos de origem continuam no documento de transferência.
- Corrigido um defeito encontrado durante a revisão: o botão de envio permanecia desativado depois da importação bem-sucedida. A ativação agora ocorre antes do retorno de sucesso, com regressão coberta por `audit_bbmodel_transfer.cjs`.

### Limites que permanecem

- A reprodução customizada sem animações GLB está limitada a canais de rotação com interpolação linear; canais position/scale, Molang e interpolações não suportadas são preservados como dados, não necessariamente executados.
- A visualização simplificada não garante texturas/UVs equivalentes ao Blockbench; a geração GLB é a via preferencial quando disponível.
- A exportação GLB não é exportação de entidade Minecraft Bedrock. Geometry, animation, client_entity, resource pack e validação em jogo continuam pendentes.
- O CI valida auditorias e compilação Android, não interação real entre iframes em aparelho nem comportamento no Minecraft Bedrock.

### Evidência automatizada

No commit `5231312cc028c52f9df0b4c8ac32ed2e41e83543`, o workflow #479 terminou com **success**. As auditorias de referência, adaptadores, DSL, contrato Nyra v1, importador Blockbench, mapeamento Blockbench → RoboTV, pré-análise GLB, compilação Gradle do APK e inspeção dos assets offline no APK passaram. Isso comprova o pipeline automatizado desse commit; não substitui ensaio físico em Android/WebView nem validação no Minecraft Bedrock.

## 9. Critério de honestidade

Este documento é uma auditoria baseada em leitura estática e testes já presentes. Não declara que os três editores funcionam no aparelho, que toda semântica Blockbench é reproduzida ou que qualquer pacote foi carregado no Minecraft. Esses critérios exigem ensaios próprios e resultados documentados.


## 10. Esclarecimento de escopo — Robô TV do Guia Interativo

O modelo/mascote Robô TV citado nas referências visuais do projeto pertence à apresentação e ao **Guia Interativo**. Ele é o personagem-guia da experiência inicial e não deve ser tratado como o modelo 3D de trabalho do editor RoboTV/Animação.

O painel RoboTV/Animação é o ambiente de edição de projetos 3D importados. A implementação de D2/D3 deve permitir que o usuário transfira rigs, hierarquias, geometria e clips de arquivos Blockbench para esse editor, sem substituir o mascote do Guia por modelos importados e sem usar o mascote como rig obrigatório de animação.

Regra de preservação:
- manter o Robô TV do Guia Interativo como personagem de apresentação;
- manter a experiência/identidade do Guia independente dos arquivos de trabalho;
- o RoboTV/Animação deve operar sobre o modelo importado ou projeto de animação selecionado;
- preservar o fluxo legado do RoboTV enquanto a edição genérica de modelos e animações amadurece;
- não considerar a presença do Robô TV no Guia como evidência de que um modelo importado está carregado no editor de animação.

## 12. Rodada focada em fidelidade de modelos Bedrock

Esta rodada prioriza a saída de modelo que o usuário consegue abrir novamente na Nyra e utilizar no fluxo Minecraft: Geometry JSON + resolução correta da textura + UVs/cubos/hierarquia. Não amplia o objetivo para gerar Behavior Pack, client entity, controllers ou um Resource Pack instalável completo.

### Correções de exportação
- O exportador parte de um clone dos metadados de origem para preservar campos conhecidos/desconhecidos. Para propriedades editáveis (rotação, pivô, inflate, mirror, UV e metadados suportados), o estado atual da cena deve prevalecer sobre o snapshot original.
- Corrigido o risco de propriedades antigas ressurgirem após edição/reset: rotação de bone/cubo e pivô de cubo não podem permanecer apenas porque estavam no documento-fonte quando o usuário os zera.
- A resolução da textura passa a ser validada contra dimensões explicitamente fornecidas quando há textura incorporada com dimensões conhecidas. Divergência é erro explícito, não exportação potencialmente desalinhada.
- O material de face é tratado como `material_instance` no formato Bedrock; a representação interna `material_name` é apenas o alias do documento Nyra.

### Testes novos
- Exportar depois de zerar rotação e remover binding não mantém valores antigos do raw source.
- Edição de `material_instance` em UV por face é refletida no `.geo.json`.
- Dimensão de textura incompatível com asset incorporado é rejeitada.

### Corte de escopo para o objetivo atual
Prioridade alta: cubos, bones, transforms/pivôs, UV box/per-face, dimensões de textura, exportar/reabrir Geometry JSON. Prioridade média: locators e metadados necessários à compatibilidade de entidades. Fora desta entrega: exportar animações/controllers, Behavior Pack, client entity e pacote de entidade completo. Malhas livres continuam bloqueadas no exportador de cubos em vez de serem convertidas com perda silenciosa.

## 13. Estado técnico da rodada de endurecimento do contrato (11/11/2026)

A branch `work/nyra-frente-d-integration` recebeu melhorias no módulo `android/scripts/nyra_scene_transfer_v1.cjs`:

- valida o envelope inteiro como JSON seguro, rejeitando funções, getters/setters, ciclos, tipos não JSON e números não finitos antes de normalizar;
- valida identificadores e nomes do projeto;
- valida hierarquia pai/filho, listas `children` duplicadas ou inconsistentes e ciclos;
- exige duração numérica finita, loop booleano, IDs únicos de clips e referências válidas a nós;
- rejeita keyframes com tempos duplicados e avisa quando ultrapassam a duração declarada;
- canais nativos `position`, `rotation`, `scale` exigem vetores de três componentes;
- canais/extensões desconhecidos mantêm valores JSON arbitrários em seus keyframes e recebem diagnóstico, sem serem convertidos à força em vetores 3D;
- interpolações ainda não reproduzidas permanecem preservadas e são sinalizadas.

A auditoria correspondente foi ampliada com casos negativos e de preservação. A validação de CI da revisão mais recente deve ser consultada pelo SHA exato antes de declarar a bateria aprovada.

**Não comprovado por esses testes:** execução real dos iframes no WebView Android, fidelidade visual de UV/material, playback de toda semântica de animação, round-trip no Blockbench externo e carregamento no Minecraft Bedrock.
