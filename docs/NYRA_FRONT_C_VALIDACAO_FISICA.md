# Nyra — Roteiro de validação da Frente C

Este roteiro combina validação automatizada e ensaio físico. CI/build verde não substitui teste real no Android.

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
- [ ] Importar JSON de personagem/blocos pelo mesmo botão, com geometrias baseadas nos blocos predefinidos.
- [ ] Confirmar preservação de nome, hierarquia, posição, rotação, escala, visibilidade, cores e estrutura de blocos suportadas pelo esquema.
- [ ] JSON inválido/não reconhecido gera mensagem clara e não substitui o modelo atual.
- [ ] GLB, glTF, OBJ, FBX, STL e BBModel continuam importando; testar arquivos auxiliares e multi-seleção quando aplicável.
- [ ] Botões de exportação/diagnóstico continuam habilitando após importação válida.

## C2 — Guia
- [ ] Percorrer as 23 etapas por anterior/próximo e navegação numérica.
- [ ] Conferir alvos/destaques nos três editores.
- [ ] Fechar por botão, Esc e toque fora; conferir retorno de foco e acessibilidade.
- [ ] Com WebGL indisponível, texto e navegação continuam utilizáveis.

## C3 — Robô do guia
- [ ] Confirmar asset `nyra_personagem.json` dentro do APK.
- [ ] Conferir seis partes, cores, transforms e visibilidade.
- [ ] Abrir/fechar o guia repetidamente; observar CPU/GPU e contexto WebGL.
- [ ] Confirmar que a animação para ao fechar e reinicia limpa ao reabrir.
- [ ] Confirmar fallback 2D diante de falha de fetch/WebGL.

## C4 — Desempenho/importação grande
- [ ] Registrar dispositivo, Android/WebView, arquivo, bytes, vértices, faces, meshes, materiais e texturas.
- [ ] Uma execução de aquecimento e cinco execuções medidas com o mesmo arquivo/dispositivo.
- [ ] Salvar relatório `nyra-performance-report.json` de cada rodada.
- [ ] Comparar mediana/P95 de leitura, parse, construção, tempo total, frame time e memória.
- [ ] Testar progresso de fases e cancelamento durante processamento; confirmar que nada parcial substitui a cena anterior.
- [ ] Confirmar que cancelamento libera buffers, geometria, materiais, URLs e listeners temporários.
- [ ] Registrar ANR, erros WebView, travamentos e regressões visuais.

## C5 — Persistência de modelos importados e limpeza
- [ ] Criar um cubo no aplicativo e confirmar que continua presente após fechar/reabrir.
- [ ] Importar um modelo JSON e um modelo 3D; confirmar que ambos continuam presentes após fechar/reabrir.
- [ ] Confirmar que os recursos/dados necessários também persistem (sem URI temporária expirada).
- [ ] Forçar encerramento/cold start e conferir restauração.
- [ ] Consultar espaço usado pelo cache e itens temporários.
- [ ] Limpeza automática remove somente dados temporários/regeneráveis dentro da política.
- [ ] Limpeza manual libera temporários e informa resultado/bytes liberados.
- [ ] Confirmar que limpeza de cache não apaga cubos, projetos importados, rascunhos ou arquivos originais salvos.
- [ ] Testar falta de espaço, arquivo temporário corrompido/ausente e reconstrução/reimportação segura.
- [ ] Ações de limpar são bloqueadas ou adiadas durante importação/salvamento ativo.

## Android integrado
- [ ] ACTION_OPEN_DOCUMENT: URIs, flags de leitura persistente, ClipData, vários arquivos auxiliares.
- [ ] Rotação durante seleção/importação e retorno do seletor.
- [ ] Retomar app após background/pressão de memória.
- [ ] Reabrir modelo salvo sem depender do arquivo de origem ainda estar acessível pelo provider.
- [ ] WebView/WebGL e cold start.

## Critério de aprovação
Só marcar aprovado quando os itens essenciais tiverem evidência de execução real; guardar aparelho, versão, arquivo, logs e resultado. Itens não executados ficam desmarcados.
