# Nyra 3D Studio — Estado da Frente C

**Branch:** `work/nyra-front-c-closeout`  
**PR:** #8 (draft)  
**HEAD auditado:** `b4e699ea21a7724abdf5fb05e1ab3fed5834f1ef`  
**Main:** não alterada; nenhum merge autorizado.

## Escopo corrigido pelo usuário

- **C1:** fazer o botão principal **Importar modelo 3D** carregar também os JSONs Nyra suportados, reutilizando o fluxo e parsers existentes e lendo estruturas/blocos predefinidos. Não é uma iniciativa ampla de conversão/interoperabilidade entre DSLs.
- **C5:** salvar no armazenamento persistente do app os modelos importados, tal como os modelos criados internamente já persistem; permitir limpeza automática e manual dos dados temporários sem apagar projetos salvos.

O plano executável completo, a ordem de implementação, os critérios de conclusão e a instrução para o próximo chat estão em `NYRA_FRONT_C_EXECUTION_PLAN.md`.

## Estado técnico auditado

- **CI do HEAD b4e699e:** workflow #406 (`42147173128`) concluído com sucesso. Build/automação remotos não substituem validação física.
- **C1:** input principal já contém `.json`; `importFileList` já inclui JSON; há parser para Nyra Scene Project v1 e parser para JSON de personagem/voxels. Ainda precisa rastrear/corrigir o roteamento entre botão → `loadSelectedFiles` → `importFileList` → `parseModel` e cobrir os formatos previstos com teste. Não alegar que C1 já está concluída só porque `.json` aparece no accept.
- **C2:** guia com 23 etapas presente; verificar navegação, alvos, acessibilidade e conteúdo em WebView.
- **C3:** ciclo do robô corrigido em `d9cb38c`; teste anti-regressão em `020fe8a`; workflow do HEAD passou. Fonte tem `voxels=[]` e `objects=[]`, portanto partes são cuboides proxy. Ensaio físico de abrir/fechar/reabrir ainda falta.
- **C4:** instrumentação e relatório presentes; falta benchmark comparativo no aparelho, otimizações justificadas, progresso percentual verdadeiro e cancelamento efetivo durante parse/import. O fluxo atual oferece confirmação/cancelamento antes de iniciar, não interrupção real durante o processamento.
- **C5:** `MainActivity.java` cobre somente temporários de exportação em `getCacheDir()/nyra-rebuildable`, com limites e retenção. Ainda falta persistência de modelos importados como os modelos criados no app e uma política de limpeza que preserve projetos persistentes.
- **Android físico:** permissões/URIs, ClipData, retomada, rotação, cold start, memória, persistência e limpeza continuam por validar.

## Regras
- Frente B fora de escopo.
- Não mudar `main`.
- Não mesclar PR #8 nem marcar ready sem autorização explícita e conclusão dos critérios do plano.
- Não declarar a Frente C pronta apenas com CI/build verde.
