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

## Próximo passo obrigatório

Executar C1: mapear o evento real do botão principal até o parser, criar fixtures dos JSONs reais e adicionar classificador testável. Em seguida, C5: localizar o mecanismo verdadeiro de save/load do editor onde os modelos criados ficam persistidos.

## Regra de integração

Manter PR draft. Não alterar main, não mesclar, não marcar ready e não alterar Frente B sem aprovação explícita.
