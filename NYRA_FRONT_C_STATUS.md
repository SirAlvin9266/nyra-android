# Estado de engenharia — Frente C

**Branch:** `work/nyra-front-c-closeout`  
**PR:** [#8](https://github.com/SirAlvin9266/nyra-android/pull/8) (aberto, draft, não integrado)  
**Revisão:** 2026-11-10

## Estado atual

A implementação de C1, C3 e C5 está integrada na branch. C2 possui 23 etapas implementadas e passou pela auditoria estática. A Frente C está na etapa de validação física; auditorias e build não substituem os testes no WebView e no Android real.

| Área | Implementação nesta branch | O que falta |
|---|---|---|
| C1 — JSON | Classificador para Scene Project v1, DSL Nyra v1, personagem Nyra e BBModel com assinatura explícita; serialização preserva cadeia interna de pivô/geometria; tipos de nó desconhecidos são rejeitados. | Teste físico da rota pelo botão principal, preservação de propriedades, JSON inválido sem substituir a cena e regressão dos formatos 3D/recursos auxiliares. |
| C2 — Guia | 23 etapas, navegação e destaque implementados; auditoria estática aprovada. | Percorrer etapas no WebView, conferir os alvos nos três editores, fechamento, foco e acessibilidade/TalkBack; confirmar fallback sem WebGL. |
| C3 — Robô-guia | Runtime usa `nyra_personagem.json`, fallback 2D e substituição do canvas ao reabrir. A geometria continua sendo proxy, pois o JSON não contém voxels/objetos preenchidos. | Conferir asset no APK, seis partes/transforms, abrir-fechar-reabrir, lifecycle da animação e fallback no aparelho. |
| C4 — Desempenho | **Retirada do escopo de fechamento da Frente C por decisão do usuário em 2026-11-10.** Instrumentação/relatórios que já existem podem permanecer como diagnóstico. | Nenhuma entrega C4 pendente; não realizar benchmark comparativo, otimizações, progresso real, cancelamento cooperativo, workers ou pixel ratio adaptativo nesta frente. Qualidade gráfica configurável fica reservada à Frente B. |
| C5 — Persistência/cache | Projetos em `files/nyra-projects`, separados de temporários em `cache/nyra-rebuildable`; escrita em blocos, limite de projeto, fsync, publicação por rename, recuperação e exclusão explícita; limpeza temporária separada. | Testes físicos de cold start, persistência, interrupção/falha de escrita, armazenamento insuficiente, providers/URIs e garantia de que a limpeza não apaga projetos. |

## Limites conhecidos

- A cópia durável de projeto preserva geometria, hierarquia e material básico; não é backup integral de texturas externas, auxiliares glTF/FBX ou clips de animação.
- O robô atual é uma representação proxy baseada nas seis partes estruturais, não o personagem voxel-art final.
- Testes de auditoria com doubles e verificações estáticas comprovam contratos selecionados, não o comportamento integral do WebView/Android.

## Conferências pré-teste concluídas

1. Revisão de coerência entre status, plano, roteiro físico e PR: referências históricas foram distinguidas do estado atual.
2. Fechamento documental de C4: nenhum benchmark/otimização C4 será exigido para testar ou encerrar C nesta rodada; instrumentação já existente não bloqueia.

## Regra de integração

Manter PR draft e aberta. Não alterar `main`, não mesclar e não marcar ready sem decisão explícita. Não antecipar a Frente B; apenas registrar qualidade gráfica configurável como item futuro dessa frente.
