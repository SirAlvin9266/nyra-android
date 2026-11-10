# Plano de engenharia e execução — Frente C do Nyra 3D Studio

**Fonte de verdade:** este documento.  
**Repositório:** `SirAlvin9266/nyra-android` · **PR:** [#8](https://github.com/SirAlvin9266/nyra-android/pull/8)  
**Branch isolada:** `work/nyra-front-c-closeout`  
**HEAD-base da revisão:** atualizado no commit desta rodada  
**Estado do PR:** aberto, draft, mergeable, não integrado.  
**Regra:** não alterar `main`, não mesclar, não marcar o PR ready e não tocar na Frente B sem autorização explícita.

> Este documento registra arquitetura, decisões e limites da Frente C. A implementação atual está descrita em `NYRA_FRONT_C_STATUS.md`; os ensaios que dependem de aparelho estão em `docs/NYRA_FRONT_C_VALIDACAO_FISICA.md`. Não trate diagnósticos históricos ou pseudocódigo como pendências atuais sem conferir o status.

## 1. Escopo confirmado

### C1 — JSON pelo botão principal

O botão **Importar modelo 3D** deve importar os projetos JSON Nyra suportados pelo mesmo seletor que já importa os modelos 3D. Reutilizar parsers existentes sempre que possível. Não criar conversão universal entre formatos nem ampliar o escopo para todos os JSONs imagináveis.

Manter os formatos existentes: GLB, glTF, OBJ, FBX, STL e BBModel, inclusive dependências externas compatíveis.

### C2 — Guia contextual

Manter as 23 etapas e garantir conteúdo correto, navegação, alvos reais, acessibilidade e fallback textual. Não ensinar funções inexistentes.

### C3 — Robô do guia

Manter a identidade baseada em `nyra_personagem.json`, garantir lifecycle de renderização e fallback 2D. A fonte atualmente contém seis partes estruturais, mas `voxels=[]` e `objects=[]`; a geometria usada é proxy, não um personagem voxel-art final.

### C4 — Desempenho e importações grandes

A instrumentação existente deve virar diagnóstico acionável: progresso honesto, cancelamento real em fronteiras seguras, benchmark reprodutível e otimizações medidas. Não inventar percentual ou botão de cancelamento inoperante.

### C5 — Persistência de importados e limpeza segura

Modelos importados devem continuar disponíveis após fechar/reabrir o app. Limpeza automática/manual deve remover apenas temporários e derivados regeneráveis, sem apagar projetos salvos, modelos do usuário ou dependências necessárias.

---

## 2. Convenções da auditoria

- **Observado:** símbolo/fluxo localizado no HEAD-base indicado.
- **Inferência:** explicação plausível ainda não demonstrada.
- **Proposta:** desenho técnico para orientar a implementação.
- **Gate:** teste ou evidência exigida para declarar concluído.

Os caminhos e trechos devem ser novamente conferidos contra o HEAD atual antes de cada patch. O branch pode avançar entre sessões.

---

## 3. C1 — Importação JSON pelo botão principal

### 3.1 Estrutura atual observada

Arquivo: `android/app/src/main/assets/www/index.html`.

| Elemento | Estrutura atual observada | Consequência |
|---|---|---|
| Botão | `#nyraImport3D` com rótulo “Importar modelo 3D” | Deve continuar sendo o único ponto de entrada principal |
| Input | `#nyraModelFiles` aceita .glb, .gltf, .obj, .fbx, .stl, .bbmodel, .json e recursos auxiliares | JSON já está aceito pelo seletor; não é necessário criar outro input |
| Seleção | `loadSelectedFiles()` filtra extensões principais e exige um modelo por vez | Confirmar se usa o helper `importFileList()` ou duplica parte dele |
| Helper | `importFileList(files)` seleciona um principal e chama `parseModel(modelFile, files)` | Presença do helper não prova que o clique passa por ele |
| Parser | `parseModel()` lê o JSON com `file.text()`, aplica `JSON.parse()` e despacha por assinatura/estrutura | É o ponto natural para classificador explícito |
| Scene JSON | `parseNyraSceneProject()` valida `Nyra Scene Project v1` e restaura por `nyraDeserializeObject()` | Reutilizar e manter round-trip existente |
| Personagem/voxels | `parseNyraCharacterProject()` inspeciona `format/type/project_type`, `parts`, `components`, `objects` e `voxels` | Testar a correspondência com cada schema real; não inferir suporte só pelo predicado |
| BBModel JSON | `parseModel()` direciona documentos com `elements` para `parseBBModel()` | Exigir assinatura suficientemente específica para evitar falso positivo |
| Commit na cena | `addModel(object,name,animations=[])` insere e seleciona o candidato; tenta restaurar estado anterior em falha | Preservar commit após parse/validação completos |
| Recursos externos | `makeManager(files)` cria object URLs e mapeia nomes/caminhos de auxiliares | Não perder BIN/texturas durante importação e persistência |

O script `android/scripts/audit_front_c.cjs` verifica presença de marcadores e executa round-trip de Scene Project v1 com um Three.js test double. Isso é útil para regressão estrutural, mas não prova sozinho o clique real no WebView nem o roteamento de todas as variantes JSON.

### 3.2 Diagnóstico e pontos que ainda precisam de prova

1. **JSON no input:** já existe. Não reimplementar essa parte sem motivo.
2. **Rota real do botão:** precisa ser seguida desde o listener de `nyraImport3D` até `loadSelectedFiles()`, `importFileList()` e `parseModel()`. Confirmar se helper e fluxo principal estão duplicados.
3. **DSL v1:** `NYRA_MODEL_DSL.md` descreve `version: 1` com `components` paramétricos. A presença de `components` na detecção de personagem não prova que o parser converte corretamente esse DSL. Criar fixture e verificar. Se não houver adapter compatível, rejeitar com mensagem precisa em vez de declarar suporte.
4. **JSON com elements:** a presença isolada de `elements` não é prova suficiente de BBModel. Conferir assinaturas, campos obrigatórios e fixtures.
5. **Estado anterior:** testar erro depois de leitura, JSON.parse, parser e validação. Nenhum caso inválido pode substituir ou danificar a cena atual.
6. **Arquivos auxiliares:** o parser deve preservar resolução de recursos de acordo com os contratos de cada loader.

### 3.3 Desenho proposto

Extrair uma função pura para classificar o schema e deixar a construção de objetos nos parsers já existentes.

```js
function classifyNyraJson(documentData) {
  if (!documentData || typeof documentData !== 'object' || Array.isArray(documentData)) {
    throw new Error('O arquivo não contém um objeto JSON de projeto.');
  }

  if (documentData.format === 'Nyra Scene Project v1') {
    return 'nyra-scene-v1';
  }

  if (isExplicitSupportedBlockbenchJson(documentData)) {
    return 'blockbench-json';
  }

  if (isExplicitSupportedCharacterProject(documentData)) {
    return 'nyra-character';
  }

  if (isExplicitSupportedNyraDsl(documentData)) {
    return 'nyra-dsl';
  }

  throw new Error('Formato JSON não suportado.');
}

async function parseNyraJsonFile(file, files) {
  const documentData = JSON.parse(await file.text());

  switch (classifyNyraJson(documentData)) {
    case 'nyra-scene-v1':
      return parseNyraSceneProject(documentData, file.name);
    case 'blockbench-json':
      return parseBBModel(asJsonFileAdapter(file, documentData), files);
    case 'nyra-character':
      return parseNyraCharacterProject(documentData, file.name);
    case 'nyra-dsl':
      return parseNyraDslProject(documentData, file.name);
    default:
      throw new Error('Formato JSON não suportado.');
  }
}

async function parseModel(modelFile, files) {
  const extension = fileExtension(modelFile.name);

  if (extension === 'json') {
    return parseNyraJsonFile(modelFile, files);
  }

  // Manter aqui os ramos atuais de BBModel, GLB/glTF, OBJ, FBX e STL.
}
```

**Importante:** este é um esqueleto ilustrativo, não um patch pronto. Os predicados `isExplicitSupported...`, `asJsonFileAdapter()` e `parseNyraDslProject()` só devem ser criados após estudar as fixtures e os parsers atuais. Não implementar suporte DSL por suposição.

### 3.4 Ordem de patch

1. Mapear listener do botão, click do input, change e rota completa até parser.
2. Listar todas as chamadas a `importFileList()` e `parseModel()`; eliminar duplicação somente se a equivalência estiver provada.
3. Criar fixtures mínimas para: Scene Project v1, Character+Voxel v4, BBModel JSON se aplicável, DSL v1, JSON inválido e JSON ambíguo.
4. Escrever classificador puro com assinaturas explícitas.
5. Conectar classificador ao parser sem alterar os ramos dos formatos 3D.
6. Validar parse em objeto candidato fora da cena ativa.
7. Chamar `addModel()` apenas após validação; em erro, manter cena anterior e reabilitar botões/input.
8. Testar dependências BIN/texturas e seleção de um arquivo principal + auxiliares.

### 3.5 Matriz de testes C1

| Caso | Esperado | Teste |
|---|---|---|
| Scene Project v1 válido | Restaurar cena serializada e propriedades cobertas pelo schema | Unidade + round-trip |
| Character+Voxel v4 válido | Interpretar apenas propriedades previstas e blocos definidos pelo projeto | Fixture real + comparação de geometria |
| BBModel JSON | Encaminhar ao parser correto apenas quando assinatura completa bater | Fixture .bbmodel e teste de classificação |
| DSL v1 | Importar somente após adapter comprovado; caso contrário informar limitação | Fixture do DSL e teste negativo/positivo |
| JSON inválido/desconhecido | Erro claro, cena ativa preservada | Estado pré/pós-importação |
| GLB/glTF/OBJ/FBX/STL/BBModel | Nenhuma regressão | Fixtures atuais + recursos auxiliares |

---

## 4. C5 — Persistência durável e cache temporário

### 4.1 Estrutura atual observada

Arquivo: `android/app/src/main/java/com/nyra/studio/MainActivity.java`.

| Parte | Implementação observada | O que não significa |
|---|---|---|
| Transferências | Exportações temporárias em `getCacheDir()/nyra-rebuildable` | Não é storage persistente de projetos |
| Limites | 256 MiB por exportação; 512 MiB agregados; retenção de 7 dias | São limites do fluxo temporário atual |
| Limpeza | `clearRebuildableCache()` evita limpar durante atividade e apaga prefixo `nyra-export-` | Não apaga nem salva modelos importados |
| Exportação | `ACTION_CREATE_DOCUMENT` para o usuário escolher destino | Não é autosave de importação |
| Seletor | Processa `ClipData` e `data.getData()`; tenta `takePersistableUriPermission()` | Permissão pode falhar; URI não pode ser a única cópia do projeto |
| Ciclo de vida | `onDestroy()` descarta transferências temporárias pendentes e destrói WebView | Não é recuperação de projeto importado |
| Editor | `addModel()` faz commit no `editor.scene`; `nyraCreateSceneJSON()` serializa Scene Project v1 | Serializar não é gravar em disco nem restaurar após cold start |

Foi localizado `localStorage` para rascunho de desenhos/paletas no editor de itens (`nyra.items.draft.v1`). Isso não prova persistência dos modelos do editor 3D. A estrutura exata que salva o modelo “criado dentro do app” ainda deve ser localizada no editor correto, sem confundir os editores.

### 4.2 Diagnóstico e decisão arquitetural

- **Fato:** `getCacheDir()` está sendo usado para temporários de exportação. O Android pode remover cache sob pressão de espaço; portanto, não usar esse diretório como única fonte de projeto permanente.
- **Fato:** `ACTION_CREATE_DOCUMENT` salva um export em destino escolhido pelo usuário; não salva automaticamente a importação na biblioteca interna.
- **Pendente:** identificar exatamente em qual editor e fluxo os modelos criados pelo usuário são persistidos. Não declarar que já existe um catálogo nativo de projetos 3D sem encontrar load/save.
- **Pendente:** medir formatos, tamanho real de recursos auxiliares e se Scene Project v1 guarda texturas/animações/skinning necessários. Não escolher persistir só a cena serializada antes desse inventário.

### 4.3 Opções de implementação

| Opção | Uso | Limite/contingência |
|---|---|---|
| A — Scene Project JSON + manifesto | Cena interna representa integralmente o estado editável necessário | Ampliar schema se texturas, imagens, animações ou metadados necessários não forem preservados |
| B — original + auxiliares + manifesto | Parser interno não conserva todos os dados de origem | Materializar todos os arquivos relacionados em storage durável, com caminhos/nomes normalizados |
| C — híbrido | Restaurar rápido com cena serializada e manter originais para reimportação/round-trip | Ocupa mais espaço; medir e deduplicar por hash somente depois de validar |
| D — IndexedDB | Só se o WebView/versão alvo demonstrar quota, persistência e recuperação confiáveis | Não presumir comportamento idêntico entre WebViews; testar cold start e limpeza de dados |
| E — storage nativo `getFilesDir()` | Biblioteca privada durável do app | Preferência se volume e backup esperados forem compatíveis; bridge precisa ser limitada e segura |
| F — SAF/`ACTION_CREATE_DOCUMENT` | Fallback manual para usuário escolher destino | Informar que é cópia externa, não salvamento automático da biblioteca local |

**Preferência inicial:** storage privado nativo em `getFilesDir()/nyra-projects` com manifesto versionado. Decidir se grava cena, original ou híbrido a partir de round-trip e recursos realmente necessários.

### 4.4 Contrato de dados proposto

```js
const record = {
  schema: 'nyra.imported-model-record',
  version: 1,
  id: createStableId(),
  name: modelFile.name,
  originalFormat: fileExtension(modelFile.name),
  savedAt: new Date().toISOString(),
  sceneProject: nyraCreateSceneJSON(importedModel),
  resources: collectRequiredResources(files)
};
```

```java
private File importedProjectsDirectory() {
    File directory = new File(getFilesDir(), "nyra-projects");
    if (!directory.exists() && !directory.mkdirs()) {
        throw new IllegalStateException("Não foi possível criar a pasta de projetos.");
    }
    return directory;
}
```

Exemplos são contratos ilustrativos. A bridge final deve:
- gerar IDs no lado nativo; nunca aceitar caminho absoluto arbitrário vindo do JavaScript;
- sanitizar nomes e extensões;
- limitar tamanho total e tamanho de chunk;
- escrever em arquivo `.pending`, validar schema/bytes/hash e publicar por rename atômico;
- realizar I/O em executor de disco, não bloquear UI;
- não aceitar payload gigante em uma chamada `@JavascriptInterface`;
- oferecer list/read/delete por ID validado, com delete como ação distinta e explícita.

### 4.5 Fluxo de escrita e restauração

```text
Selecionar → ler arquivos e recursos → parsear → validar
                         ↓
             construir candidato fora da cena
                         ↓
               serializar cena + recursos
                         ↓
          gravar em .pending no filesDir privado
                         ↓
       verificar tamanho + SHA-256 + versão + vínculos
                         ↓
             rename/publicação atômica
                         ↓
             confirmar projeto no catálogo
                         ↓
          commit visual e estado “salvo”

cold start → listar catálogo → validar manifestos → restaurar projeto
             ↘ dependência ausente/corrompida → manter registro e avisar relink/reimport

limpar cache → excluir só namespace regenerável; nunca nyra-projects
```

A UX de cold start deve seguir o comportamento real do editor: catálogo de projetos, último projeto ou documento de trabalho. Não sobrescrever silenciosamente projeto diferente.

### 4.6 Limpeza e integridade

- Separar diretórios/namespace de projetos duráveis e temporários.
- Limpeza automática/manual só apaga temporários com identificação inequívoca.
- Não apagar arquivo se não for possível provar que é regenerável.
- Não apagar projeto, manifesto ou recurso necessário por meio de “Limpar cache”.
- Reportar quantidade e bytes antes/depois; se falhar, deixar dados intactos e reportar.
- Bloquear/adiar limpeza durante gravação ou importação.
- Testar disco cheio, interrupção, checksum incorreto, auxiliar ausente, duplicidade de nomes, migração de versão, restore de cold start e cache limpo.
- A permissão SAF persistida pode continuar apontando para documento removido/movido; não depender só dela como cópia durável.

---

## 5. C2 — Guia contextual

### Estrutura observada

- Shell do guia: `#nyraGuideRoot`.
- Navegação: `#nyraGuidePrev`, `#nyraGuideNext`, `#nyraGuideOpen`.
- Funções: `renderNyraGuide()`, `closeNyraGuide()`.
- Existem 23 etapas; o audit atual conta os objetos de etapa e verifica marcadores.
- O render abre editor conforme `step.app` e resolve alvo conforme `step.target`. O teste estático não prova que cada seletor resolve dentro do iframe real nem que TalkBack anuncia corretamente.

### Desenho proposto

```js
function resolveGuideTarget(step) {
  const frame = step.app ? editorFrames[step.app] : null;
  const doc = frame?.contentDocument;
  if (!step.target) return { element: null, mode: 'text-only' };

  const element = doc?.querySelector(step.target)
    || document.querySelector(step.target);

  return element
    ? { element, mode: 'highlight' }
    : { element: null, mode: 'text-only', reason: 'target-not-found' };
}
```

Validar contra o sandbox/origem efetivos dos iframes antes de usar literalmente. Alvo ausente deve degradar para explicação textual, sem exceção nem destaque enganoso.

### Testes e aceitação

- 23 etapas, título/texto/status coerentes com a interface atual.
- Anterior, próximo, navegação numérica, conclusão, fechamento e reabertura.
- Troca de editor e rolagem até alvo real.
- Alvo ausente: modo textual contextual.
- Foco visível e ordem de tabulação previsível.
- TalkBack anuncia etapa/título/descrição e controles.
- WebGL indisponível não bloqueia texto/navegação.

---

## 6. C3 — Robô do guia e lifecycle Three.js

### Estrutura observada

- `closeNyraGuide()` oculta a janela, chama `nyraGuideRobotRuntime.stop()` e zera a referência.
- Audit estático verifica presença dessas duas chamadas.
- O runtime cria `WebGLRenderer` e existe fallback 2D.
- Fonte possui seis partes estruturais; `voxels` e `objects` vazios: renderização atual usa proxies.

### Contrato proposto

```js
function createGuideRobotRuntime(canvas) {
  let rafId = 0;
  let stopped = false;
  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: true
  });

  function frame() {
    if (stopped) return;
    rafId = requestAnimationFrame(frame);
    renderer.render(scene, camera);
  }

  frame();

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(rafId);
      removeOwnedListeners();
      disposeOwnedSceneResources();
      renderer.dispose();
    }
  };
}
```

Não copiar cegamente: mapear listeners e propriedade de recursos. Só descartar o que pertence ao runtime do robô; não liberar geometria/material compartilhado com o editor. `renderer.dispose()` deve liberar recursos GPU. `forceContextLoss()` é opcional e depende de `WEBGL_lose_context`; avaliar em WebView físico antes de adotá-lo.

### Testes e aceitação

- Abrir/fechar 20 vezes; loop RAF retorna a zero após fechar.
- `stop()` idempotente.
- Listeners removidos e renderer descartado uma vez.
- Reabrir cria instância nova, sem duplicar loops/contextos.
- Fallback 2D funciona em falha WebGL/fetch.
- Medir CPU/GPU/contextos em aparelho; spies estáticos não bastam.

---

## 7. C4 — Importação grande, progresso, cancelamento e desempenho

### Estrutura observada

- `parseModel()` é `async`, mas a chamada `JSON.parse(raw)` é síncrona e bloqueia o event loop até terminar. Uma função async não torna o parse síncrono não bloqueante.
- `file.text()` é aguardado; parse, conversão e parte da construção podem ainda executar no thread principal.
- Eventos existentes: `import_started`, `import_stage`, `import_completed`, com tempos de etapa e métricas da cena/renderer.
- Não foi encontrado contrato de cancelamento propagado entre `loadSelectedFiles()`, `parseModel()` e parsers. Desabilitar botões não é cancelamento.
- `GLTFLoader.parseAsync()` é disponível na documentação atual do loader; confirmar a versão empacotada pelo APK e assinaturas concretas antes de mudar.

### Pipeline-alvo proposto

```js
async function importWithProgress(file, files, { signal, onStage }) {
  signal?.throwIfAborted();
  onStage({ id: 'read', label: 'Lendo arquivo' });
  const raw = await file.text();

  signal?.throwIfAborted();
  onStage({ id: 'parse', label: 'Interpretando formato' });
  const parsed = await parseBySignature(file, raw, files, {
    signal, onProgress: onStage
  });

  signal?.throwIfAborted();
  onStage({ id: 'validate', label: 'Validando modelo' });
  validateParsedModel(parsed);

  signal?.throwIfAborted();
  onStage({ id: 'commit', label: 'Adicionando ao editor' });
  return parsed;
}
```

`AbortSignal` só interrompe código que coopera com ele. Não cancela automaticamente `JSON.parse()` síncrono nem uma função que ignora o sinal.

### Decisão técnica por gargalo

1. Medir leitura, parse, descompressão, loader, construção de geometria/materiais/texturas, árvore/inspector e commit.
2. Se loader já oferece callback/cancelamento, propagar a API nativa.
3. Se loops próprios dominarem, dividi-los em lotes e ceder event loop entre lotes; checar cancelamento entre lotes.
4. Se processamento de dados puro dominar, avaliar Worker. Transferir strings, ArrayBuffer e estruturas clonáveis; não tentar clonar DOM, funções, Object3D ou recursos WebGL.
5. Se loader depende de DOM/imagem/contexto ou se dependências Three.js não forem worker-safe, manter loader no thread principal e mover somente pré-processamento transferível.
6. Se Worker não for compatível, fazer refatoração cooperativa; caso isso também não seja seguro, deixar a fase explicitamente não cancelável e cancelar na próxima fronteira segura.
7. Construir candidato fora da cena ativa e trocar somente após validação.
8. Cancelamento/erro deve liberar buffers, geometrias, materiais, object URLs e listeners temporários.

### Benchmark

- Fixar arquivo de referência e SHA-256.
- Registrar app/commit, aparelho, Android, WebView, memória livre e configuração gráfica.
- Uma execução de aquecimento + cinco execuções medidas.
- Relatar mediana, P95 e dispersão.
- Medir duração por fase, tempo total, long tasks, frame P95, memória JS quando disponível, geometria/texturas/draw calls e tempo até primeiro frame utilizável.
- Comparar antes/depois no mesmo aparelho e arquivo.
- Reverter otimização sem ganho além da variação observada ou com perda visual/funcional.

---

## 8. Robustez Android transversal

Arquivo: `MainActivity.java`.

O código atual coleta `ClipData` e `data.getData()`, tenta permissão persistente e tem fluxo de exportação por SAF. A validação física ainda precisa cobrir providers reais, URI que perde validade, retorno do seletor, rotação, retomada, processo morto, armazenamento cheio e WebView/WebGL.

Matriz obrigatória:

| Cenário | Verificação |
|---|---|
| Um URI | Importa e lê bytes corretos |
| ClipData com principal + auxiliares | Mantém associação e ordem/nome dos recursos |
| Provider sem permissão persistente | App materializa cópia durável antes de considerar salvo |
| Rotação/retomada | Nenhum callback perdido, duplicado ou travado |
| Processo morto | Projeto persiste e recupera após cold start |
| Falta de espaço | Rollback, projeto anterior intacto e mensagem clara |
| WebView/WebGL | Fallback textual/2D sem crash |
| Cache limpo pelo sistema | Projetos permanecem restauráveis |

---

## 9. Sequência de implementação e gates

### Fase 0 — confirmar o ponto exato de partida
- Confirmar HEAD e status do PR.
- Conferir diffs/arquivos antes de patch.
- Mapear listener real do botão C1.
- Localizar save/load dos modelos nativos, sem assumir que rascunho do editor de itens é o mecanismo do editor 3D.
- Fixar fixtures e baseline.

### Fase 1 — C1
- Criar classificador de JSON e fixtures.
- Corrigir/centralizar rota do botão principal.
- Testar estado preservado em erro e regressão dos formatos 3D.

### Fase 2 — C5
- Decidir schema de persistência após inspecionar recursos/round-trip.
- Implementar catálogo durável, bridge limitada e escrita atômica.
- Implementar cold start e limpeza estritamente separada.
- Testar disco cheio, interrupção, integridade e recurso auxiliar.

### Fase 3 — C2 e C3
- Testar alvos reais e acessibilidade.
- Testar stop/restart e corrigir lifecycle sem descartar recursos compartilhados.

### Fase 4 — C4
- Capturar baseline.
- Implementar estágios/progresso/cancelamento de acordo com os parsers reais.
- Otimizar somente gargalos medidos.
- Executar stress e benchmark.

### Fase 5 — integração
- Validar URI, ClipData, permissões, rotação, retomada, cold start, WebView/WebGL e armazenamento em aparelho.

### Fase 6 — gates finais
- Executar `audit_front_c.cjs`, demais auditorias, testes e build debug.
- Inspecionar APK e assets offline.
- CI verde no HEAD final.
- Preencher roteiro físico com dispositivo, versão, SHA e logs.
- PR segue draft sem merge até validação física e aprovação explícita.

### Critérios globais de fechamento
- C1: JSON suportado entra pelo botão principal e todos os formatos existentes continuam funcionais.
- C2: 23 passos navegáveis, corretos, acessíveis e com fallback textual.
- C3: abrir/fechar/reabrir sem loop órfão, listeners ou renderer acumulados.
- C4: benchmark antes/depois; progresso/cancelamento verdadeiros; sem degradação.
- C5: importados persistem entre sessões; limpeza nunca apaga projetos.
- Android: armazenamento, retomada e seletor validados fisicamente.
- CI verde no commit final e evidências registradas.
- Compilação isolada jamais conta como fechamento.

---

## 10. Referências técnicas externas consultadas

Estas fontes sustentam APIs e restrições gerais, não comprovam compatibilidade específica da versão empacotada no APK. A versão de Three.js e WebView do projeto deve ser confirmada nos arquivos de build/assets.

1. Android Developers — [Armazenamento específico do app](https://developer.android.com/training/data-storage/app-specific): distingue arquivos persistentes e cache; cache pode ser removido pelo sistema sob pressão de espaço.
2. Android Developers — [Storage Access Framework](https://developer.android.com/training/data-storage/shared/documents-files): `ACTION_OPEN_DOCUMENT`, `ACTION_CREATE_DOCUMENT`, URIs e permissões.
3. Three.js — [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html): APIs `parse()` e `parseAsync()`.
4. Three.js — [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer): `dispose()` libera recursos GPU; `forceContextLoss()` depende de suporte da extensão.
5. MDN — [Structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm): limites do que pode atravessar fronteira de Worker e objetos que não podem ser clonados.

---

## 11. Continuidade — executar, não replanejar

Na próxima sessão, confirmar HEAD e continuar diretamente com:
1. C1: mapear clique → input → `loadSelectedFiles()` → `importFileList()` → `parseModel()`, criar fixtures e classificador.
2. C5: encontrar a persistência real do editor/modelo nativo e então fechar arquitetura.
3. C2/C3: teste comportamental do guia e runtime.
4. C4: baseline, progresso/cancelamento e otimização.
5. Android, gates e checklist físico.

Não pedir ao usuário para repetir contexto ou reabrir escopo. Não declarar as propostas deste documento como funcionalidades prontas. Não mexer na Frente B, não alterar `main`, não marcar PR ready e não mesclar sem autorização explícita.


## Decisão de escopo — C4 retirada (2026-11-10)

A C4 não integra os gates de conclusão da Frente C. Os seguintes trabalhos não devem ser executados nesta frente: benchmark comparativo com cinco execuções, otimização de JSON.parse, progresso real por fases, cancelamento cooperativo, processamento em workers, pixel ratio adaptativo, qualidade gráfica configurável, instancing/compartilhamento de geometria/material e otimização de draw calls/construção geométrica. Qualidade gráfica configurável permanece reservada à Frente B. Instrumentação e relatório já existentes podem permanecer sem gerar obrigação de entrega.

O teste físico final da Frente C cobre C1, C2, C3, C5 e integração Android, conforme `docs/NYRA_FRONT_C_VALIDACAO_FISICA.md`.
