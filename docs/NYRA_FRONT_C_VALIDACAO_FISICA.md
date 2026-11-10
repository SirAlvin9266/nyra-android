# Nyra — Roteiro de validação física da Frente C

Este roteiro é a lista do que exige execução real no aparelho. Auditorias e build verdes não substituem ensaio Android/WebView.

## Identificação
- Branch: `work/nyra-front-c-closeout`
- PR: #8 (draft)
- Commit testado:
- APK/SHA-256:
- Aparelho:
- Android/WebView:
- Data:

## C1 — Importação JSON pelo botão principal
- [ ] Tocar em **Importar modelo 3D** e selecionar JSON Nyra suportado.
- [ ] Importar Nyra Scene Project v1 pelo mesmo botão.
- [ ] Importar JSON de personagem/blocos pelo mesmo botão, conforme schema suportado.
- [ ] Confirmar nome, hierarquia, posição, rotação, escala, visibilidade, cores e estrutura de blocos suportadas.
- [ ] JSON inválido/não reconhecido gera mensagem clara e não substitui o modelo atual.
- [ ] GLB, glTF, OBJ, FBX, STL e BBModel continuam importando; testar auxiliares/multi-seleção quando aplicável.
- [ ] Botões de exportação/diagnóstico continuam habilitando após importação válida.

## C2 — Guia
- [ ] Percorrer as 23 etapas por anterior/próximo e navegação numérica.
- [ ] Conferir alvos/destaques nos três editores.
- [ ] Fechar por botão, Esc e toque fora; conferir retorno de foco e acessibilidade/TalkBack.
- [ ] Com WebGL indisponível, texto e navegação continuam utilizáveis.

## C3 — Robô do guia
- [ ] Confirmar asset `nyra_personagem.json` dentro do APK.
- [ ] Conferir seis partes, cores, transforms e visibilidade.
- [ ] Abrir/fechar o guia repetidamente.
- [ ] Confirmar que a animação para ao fechar e reinicia corretamente ao reabrir.
- [ ] Confirmar fallback 2D diante de falha de fetch/WebGL.

## C5 — Persistência de modelos e limpeza segura
- [ ] Criar um cubo no aplicativo e confirmar persistência após fechar/reabrir.
- [ ] Importar um modelo JSON e um modelo 3D; confirmar persistência após fechar/reabrir.
- [ ] Confirmar independência de URI temporária e disponibilidade dos dados necessários.
- [ ] Forçar encerramento/cold start e conferir restauração.
- [ ] Consultar espaço usado pelo cache e itens temporários.
- [ ] Confirmar que limpeza automática/manual remove apenas dados temporários/regeneráveis.
- [ ] Confirmar que limpeza de cache não apaga cubos, projetos importados, rascunhos ou arquivos originais salvos.
- [ ] Testar falta de espaço e arquivo temporário corrompido/ausente.
- [ ] Confirmar que a limpeza é bloqueada/adiada durante importação/salvamento ativo.

## Android integrado
- [ ] ACTION_OPEN_DOCUMENT: URIs, flags de leitura persistente, ClipData e múltiplos arquivos auxiliares.
- [ ] Rotação durante seleção/importação e retorno do seletor.
- [ ] Retomar app após background/pressão de memória.
- [ ] Reabrir modelo salvo sem depender de o arquivo de origem continuar acessível pelo provider.
- [ ] WebView/WebGL e cold start.

## Fora do teste de fechamento C
C4 foi retirada do escopo por decisão explícita. Não executar benchmark comparativo de cinco medições, otimizações de parse/geometria/renderização, workers, progresso por fases ou cancelamento cooperativo como condição para esta rodada. Instrumentação existente pode ser usada como observabilidade incidental, sem criar gate de aprovação.

## Critério de aprovação
Marcar aprovado somente quando os itens essenciais tiverem evidência real; registrar aparelho, versão, arquivo, logs e resultado. Itens não executados ficam desmarcados.
