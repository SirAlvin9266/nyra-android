# Estado de engenharia — Frente C

**Branch:** `work/nyra-front-c-closeout`  
**PR:** [#8](https://github.com/SirAlvin9266/nyra-android/pull/8) (aberto, draft, não integrado)  
**HEAD-base da revisão técnica:** `96ddb300bc14a1598b6b3a55eb81b88ca9b58eb5`

## Estado real nesta revisão

Esta revisão elevou o plano de texto para um plano técnico comparando código atual, propostas de implementação, alternativas, testes e referências externas. **A revisão documental não implementou as mudanças funcionais C1–C5.**

| Área | Base existente | Pendência |
|---|---|---|
| C1 JSON | input aceita .json; parsers Scene v1 e Character JSON; despacho por assinatura/estrutura | provar rota do botão, definir schemas realmente suportados e testar parser correto |
| C2 guia | 23 etapas, navegação e destaque implementados | teste DOM/WebView, alvos, acessibilidade e fallback |
| C3 robô | runtime stop ao fechar e fallback 2D; proxy baseado em seis partes | prova comportamental RAF/dispose/reopen e ensaio WebGL |
| C4 desempenho | eventos de import, etapas e relatório | baseline comparativo, progresso/cancelamento verdadeiros e otimização medida |
| C5 persistência | Scene Project serializador; cache temporário de exportação; SAF para export | localizar save/load real de modelos nativos e implementar persistência de importados |
| Android | ClipData, URI e tentativa de permissão persistente | validação de provider, cold start, rotação, retomada, pressão de memória e storage |

## Constatações técnicas que não devem ser confundidas

- A extensão .json no input não prova que qualquer JSON seja suportado.
- A presença do campo `components` no predicado não prova que o DSL matemático seja interpretado corretamente.
- A presença de `nyraCreateSceneJSON()` prova serialização, não gravação/restauração.
- O `localStorage` encontrado para `nyra.items.draft.v1` refere-se ao editor de itens, não comprova persistência do editor 3D.
- `getCacheDir()/nyra-rebuildable` armazena temporários de exportação, não modelos importados permanentes.
- O teste estático do audit não substitui integração real WebView/Android.

## Estado atual da implementação

O plano técnico foi convertido em mudanças de código nesta branch. Consulte a seção **Implementação integrada nesta branch** abaixo e os gates físicos em aberto; as afirmações de constatação histórica acima continuam válidas como diagnóstico anterior, não como estado atual.

## Regra de integração

Manter PR draft. Não alterar main, não mesclar, não marcar ready e não alterar Frente B sem aprovação explícita.


## Implementação integrada nesta branch
- C1: importação principal permanece no seletor existente; JSON separa Scene v1, DSL Nyra v1 (validador e construtor do painel matemático) e projetos de personagem. JSON arbitrário com components não é aceito; BBModel exige elements, outliner e meta.
- C1: serializador Scene v1 passa a preservar a cadeia interna de pivô/geometria da DSL; o deserializador rejeita tipos de nó desconhecidos.
- C3: canvas do robô-guia é substituído ao reabrir após dispose do renderer.
- C5: cópia local da cena importada no armazenamento privado Android, transferência por blocos, limite 240 MiB, fsync e troca de arquivo temporário; restauração no boot e exclusão explícita. A cópia mantém geometria/hierarquia/material básico, mas não texturas externas ou clips de animação.
- C4: nenhuma otimização foi inventada sem benchmark; o parse JSON síncrono ainda não é cancelável e requer medição no dispositivo.

## Gates de validação física
- CI de auditoria/build no HEAD integrado.
- Round-trip DSL no Three.js real incluindo todas as primitivas, tubo, hierarquia e pivôs.
- Cold start, interrupção de gravação, espaço insuficiente e limpeza segura de cache no Android.
- C2: todos os 23 alvos e acessibilidade no WebView.
- C3: reabertura WebGL/2D no aparelho.
- C4: benchmark antes/depois no mesmo dispositivo/arquivo.
- glTF/FBX com recursos externos exigem reanexação; a cópia Scene JSON não é backup integral do arquivo original.
