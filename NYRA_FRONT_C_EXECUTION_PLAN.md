# Plano de execução — Fechamento da Frente C (fonte de verdade)

**Repositório:** `SirAlvin9266/nyra-android`  
**PR:** #8 — https://github.com/SirAlvin9266/nyra-android/pull/8  
**Branch exclusiva:** `work/nyra-front-c-closeout`  
**HEAD auditado ao criar este plano:** `b4e699ea21a7724abdf5fb05e1ab3fed5834f1ef`  
**Situação:** PR aberto, draft, mergeable; CI do HEAD auditado concluído com sucesso.  
**Regra de integração:** não alterar `main`, não mesclar, não marcar PR como pronto e não tocar na Frente B sem instrução explícita do usuário.

Este documento é o roteiro vinculante para a próxima etapa. Ele corrige a interpretação anterior de C1 e C5. Não reabrir discussão de escopo nem refazer esta auditoria sem uma razão técnica concreta.

## Decisões de escopo confirmadas pelo usuário

### C1 — Importação JSON pelo botão principal
O objetivo **não** é criar interoperabilidade ampla entre três esquemas, reescrever o exportador ou prometer preservação de rigs/texturas em todos os sentidos. A solicitação é fazer o botão atual **“Importar modelo 3D”** carregar também modelos/projetos `.json`, junto com os formatos que já aceita.

O código atual já tem:
- o input `nyraModelFiles` com `.json` no `accept`;
- `importFileList(files)`, que inclui `json` entre as extensões candidatas;
- `parseNyraSceneProject(...)` para `Nyra Scene Project v1`;
- `parseNyraCharacterProject(...)` para formatos estruturados de personagem/voxels;
- a seleção atual compartilhada do botão principal.

O fluxo, porém, precisa ser rastreado ponta a ponta: botão → input → `loadSelectedFiles()` → `importFileList()` → `parseModel()` → parser JSON correto. O plano de implementação é identificar o desvio real (inclusive seleção de parser baseada em extensão/formato), fazer o JSON cair nos parsers Nyra já existentes conforme `format`/estrutura do conteúdo, e preservar o importador normal de GLB/glTF/OBJ/FBX/STL/BBModel e arquivos auxiliares. Não criar gerador de geometria arbitrária: no formato baseado em blocos, ler as definições de bloco predefinidas e seus dados, mantendo a geometria canônica esperada.

Critérios:
- importar pelo mesmo botão, sem botão JSON separado;
- aceitar os esquemas JSON Nyra efetivamente previstos pelo projeto;
- distinguir Scene Project v1 e Character+Voxel/JSON de blocos por assinatura/estrutura, não por tentativa cega;
- JSON inválido ou não suportado deve apresentar erro claro e não substituir a cena carregada;
- modelos 3D e auxiliares continuam funcionando;
- teste automatizado cobre cada variante suportada e preserva regressão dos formatos já aceitos.
Não expandir C1 para converter entre DSL v1 (`components`), Scene Project v1 e Character+Voxel v4, salvo se o código e os arquivos de projeto demonstrarem que isso é indispensável ao fluxo pedido. Registrar limites de formato com precisão.

### C2 — Guia contextual
Manter as 23 etapas existentes e testar/ajustar textos, navegação, destaques, alvos reais, fechamento e acessibilidade. Atualizar passo de importação para explicar que o botão principal aceita os modelos 3D e JSON suportados. Não ensinar função inexistente.

### C3 — Robô demonstrativo do guia
A correção para parar o loop ao fechar o guia já foi feita em `d9cb38c`, com regressão estática em `020fe8a`, e o workflow do HEAD atual passou. Ainda validar lifecycle no código e criar/reforçar teste comportamental quando a infraestrutura permitir:
- fechar guia cancela RAF/loop;
- renderer e recursos próprios do robô são descartados;
- referência runtime é zerada;
- reabrir cria runtime limpo;
- fallback 2D continua disponível.
A fonte `nyra_personagem.json` tem `voxels=[]` e `objects=[]`; não declarar personagem voxel-art completo. Cuboides proxy refletem as seis partes estruturais.

### C4 — Desempenho e importações grandes
Há instrumentação (eventos de leitura/parse/construção, métricas de cena/renderer/frame/heap e relatório exportável); ainda não há benchmark comparativo demonstrado nem otimizações aprovadas por evidência. A importação atual usa estados e confirmação antes do parse; não oferece progresso percentual confiável nem cancelamento efetivo durante parse/import.

Sequência:
1. inspecionar quais parsers/etapas são síncronos e quais são assíncronos, gargalos de UI e alocação;
2. adicionar medição repetível automatizada onde possível e especificar modelo/dispositivo físico de referência;
3. implementar progresso por fases com contagens reais quando disponíveis (não inventar percentuais);
4. oferecer cancelamento real entre fases e dentro de processamento cooperativo; se o parser bloqueia o event loop, avaliar Worker ou refatoração cooperativa antes de expor botão de cancelar;
5. medir e aplicar otimizações justificadas (geometria, materiais, draw calls, pixel ratio/renderização sob demanda, memória) sem degradar aparência;
6. testes de cancelamento, erro e limpeza de recursos, mais benchmark físico de cinco execuções após aquecimento.
Não apresentar um botão de cancelar que não possa interromper o trabalho.

### C5 — Persistência de modelos importados e limpeza de cache
O requisito confirmado pelo usuário é bem específico: modelos criados dentro do Nyra já ficam salvos; modelos importados não ficam. O aplicativo deve guardar no dispositivo dados suficientes dos modelos importados para que continuem disponíveis após fechar/reabrir. Deve haver limpeza automática e ação manual para limpar o cache e liberar espaço.

O código Android atual em `MainActivity.java` implementa **apenas temporários de exportação** em `getCacheDir()/nyra-rebuildable`, limites 256 MiB por exportação/512 MiB agregados, limpeza após 7 dias e botão para limpar esses temporários. Isto não satisfaz persistência de modelos importados. O roadmap já descreve armazenamento de projetos/rascunhos separado dos temporários; preservar essa distinção.

Plano:
1. localizar o mecanismo que persiste os modelos nativos (ex.: cubo criado no app) e comparar com fluxo `addModel/importFileList` de modelos importados;
2. identificar o formato de persistência usado pelos modelos nativos e reutilizá-lo ou criar extensão mínima compatível para modelos importados, armazenando projeto/dados de origem e recursos necessários no diretório privado persistente do app (não depender de `getCacheDir()` para o que deve sobreviver);
3. garantir restauração de projetos importados em cold start/reabertura;
4. separar claramente dados persistentes do projeto e cache temporário/reconstruível;
5. adicionar limpeza automática de cache temporário por orçamento/idade/pressão de espaço e ação manual na interface;
6. limpeza nunca apaga projetos importados salvos, modelos criados pelo usuário ou recursos associados necessários ao projeto. Se o comando for “limpar cache”, remover apenas artefatos regeneráveis; para apagar projetos, exigir ação de exclusão distinta e explícita;
7. reportar bytes/itens e estado de falha, evitar operações durante gravação/importação; testar integridade e recuperação quando artefato de cache faltar/corromper.
Não copiar o conceito anterior de “cache de thumbnails/geometrias” como objetivo central sem necessidade: o objetivo primário é persistir modelos importados como os criados no aplicativo e limpar somente dados temporários.

## Ordem integrada de implementação

**Fase 0 — Preparação**
- conferir HEAD/estado do PR, árvore, workflow e diffs; nunca sobrescrever commit concorrente;
- inspecionar armazenamento atual de modelos nativos e persistência de cenas;
- criar matriz de formatos JSON suportados a partir dos exemplos/fixtures reais existentes.

**Fase 1 — C1 e C5 (dependência funcional)**
- corrigir parser/roteamento do JSON no botão principal e testar;
- resolver persistência de modelos importados reaproveitando o mecanismo nativo;
- definir limites e política de limpeza sem tocar em projetos.

**Fase 2 — C3 e C2**
- confirmar stop/restart real do robô; corrigir e testar regressões;
- conferir os 23 passos do guia e ajustar instruções/alvos.

**Fase 3 — C4**
- medição reprodutível; progresso/cancelamento de verdade; otimizações justificadas e teste de stress.

**Fase 4 — Integração e robustez Android**
- URIs, ClipData, permissões persistentes, seleção múltipla, rotação, retorno do seletor, interrupção de processo, cold start, memória, WebView/WebGL, limpeza e recuperação.

**Fase 5 — Gates**
- executar audit Front C e demais scripts;
- executar build debug, inspeção do APK e CI no HEAD final;
- atualizar documentação e relatório de evidências;
- manter checklist físico desmarcado até executar no aparelho;
- PR permanece draft e sem merge até CI verde, validação física e aprovação explícita.

## Critérios globais de fechamento
- C1: importar JSON usando exatamente o botão principal e testes de todos os formatos suportados.
- C2: 23 etapas navegáveis, alvos certos, conteúdo fiel e acessível.
- C3: abrir/fechar/reabrir sem loop órfão nem acumular renderer/contexto.
- C4: benchmark antes/depois com mesmo arquivo e dispositivo; progresso/cancelamento funcional; sem piora visual.
- C5: modelos importados persistem entre sessões; limpeza automática/manual não apaga projetos.
- Android: seleção, armazenamento, retomada e memória validados.
- CI verde no commit final; APK inspecionado; evidências registradas.
- Nenhuma alegação de conclusão baseada só em compilação.

## INSTRUÇÃO DE CONTINUIDADE — EXECUTAR, NÃO REPLANEJAR

**Ao abrir este repositório/chat numa próxima sessão, basta implementar.** Comece lendo este documento e confirme o HEAD da branch `work/nyra-front-c-closeout`. Não peça ao usuário para repetir o contexto, não faça outra rodada genérica de planejamento e não reinterprete C1/C5. Retome diretamente pela Fase 0 curta (verificação de HEAD/estado e localizar persistência nativa) e então execute Fase 1 → Fase 5 na ordem acima, registrando commits pequenos e testes. Se a conversa estiver perto do limite, priorize salvar o estado técnico no repositório e deixe explícito o próximo passo de código. Não interrompa para pedir autorização a cada correção dentro do escopo já aprovado. **A única barreira que permanece é não mesclar na `main`, não marcar o PR ready e não alterar a Frente B sem autorização explícita.**
