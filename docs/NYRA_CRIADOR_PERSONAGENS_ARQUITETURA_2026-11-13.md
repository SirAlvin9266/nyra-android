# Nyra — Criador de Personagens: arquitetura e primeira entrega (13/11/2026)

## Escopo

Esta frente trata exclusivamente do Criador de Personagens. Não define infraestrutura comum às oficinas, não muda o Pixel Lab, não muda o RoboTV e não inclui a Frente B. A página independente `character.html` é a fonte editável do Criador; a cópia Base64 em `index.html` é o artefato embarcado que precisa permanecer idêntico após decodificação.

## Diagnóstico confirmado por leitura de código

O editor concentrava no mesmo módulo:
- criação da cena Three.js e render loop;
- personagem demonstrativo e seus grupos;
- voxels e formas personalizadas;
- seleção por identificadores diferentes;
- pintura e escopo de materiais;
- histórico legado de undo baseado em closures;
- importação Blockbench e construção da hierarquia de pivôs;
- exportação JSON/BBModel;
- projeção de dados para `nyra.scene-transfer` e comunicação com o shell/RoboTV.

Havia três raízes de conteúdo distintas (`character`, `voxelGroup`, `bbmodelState.rootGroup`) e operações de seleção/pintura com ramificações específicas. A UI não oferecia uma operação genérica de associação para todos os objetos do Criador. O histórico legado não fornecia redo.

## Primeira entrega nesta branch

Foi introduzido o módulo local `NyraCharacterScene`, que:
- dá identidade estável em runtime aos nós Three.js;
- enumera a hierarquia da cena;
- bloqueia auto-parenting, ciclos, raízes protegidas, destino mesh e associação redundante;
- executa reparenting preservando a matriz mundial quando a decomposição é exata;
- rejeita transformações que não possam ser representadas sem perda (por exemplo, cisalhamento não representável por TRS simples).

A interface passou a incluir:
- uma árvore de cena clicável;
- uma lista de possíveis pais;
- comandos “Associar a” e “Remover associação”;
- desfazer/refazer das operações de associação.

O HTML independente foi sincronizado com a cópia Base64 do shell. A igualdade foi conferida por decodificação: 80.035 caracteres em ambos os lados.

## Testes introduzidos

- `android/scripts/audit_character_creator_architecture.cjs`: valida a sintaxe do módulo e marcadores críticos de arquitetura, controles, importador/exportador e ponte.
- `android/scripts/test_character_scene_hierarchy.cjs`: exercita regras anti-ciclo, auto-parenting, destino inválido, raízes protegidas, detecção de ancestral e enumeração.

A execução do CI inicial falhou em um teste preexistente porque as duas cópias do Criador estavam divergentes. A sincronização foi corrigida e confirmada por comparação Base64/decodificação. Um novo workflow foi disparado depois da correção.

## Limitações e pendências

- Esta entrega não conclui a migração integral de seleção, pintura, transformações, histórico, importadores e exportadores para o novo núcleo.
- O histórico de operações antigas continua no caminho legado; undo/redo foi adicionado inicialmente para associação/reparenting.
- É necessário verificar casos reais de reparenting em modelos com pais rotacionados/escalados e confirmar a preservação dos dados BBModel no export.
- A árvore ainda é uma representação inicial; a experiência móvel precisa ser refinada.
- Nenhum teste executado por CI substitui validação física no WebView Android.
- A implementação ainda precisa ser provada com modelos reais, especialmente peças BBModel com pivôs e animações.

## Proteções confirmadas

- `robotv.html` não foi alterado nesta branch.
- Pixel Lab não foi alterado nesta branch.
- `main` não foi alterada.
- PRs preexistentes não foram mescladas nem reescritas.
- A branch nasce de `work/nyra-robotv-dynamic-hierarchy` para usar a entrega recente como base de comparação, sem fazer merge automático.

## Referências

- Issue #22 — reformulação arquitetural do Criador de Personagens.
- PR #23 — primeira entrega WIP do núcleo e hierarquia.
- Issue #21 — interface e associação de peças.


## Segunda entrega — histórico unificado (13/11/2026)

A inspeção do fluxo revelou que o botão e o atalho de teclado eram registrados duas vezes. Um handler novo para hierarquia e redo era sobrescrito mais adiante pelo handler legado de undo. Isso fazia o comportamento real divergir da implementação pretendida.

Correções aplicadas na branch:
- Um único stack agora recebe os comandos de hierarquia e as ações legadas registradas por pushUndo.
- O handler tardio que sobrescrevia o botão Desfazer e Ctrl+Z foi removido.
- Transformações concluídas pelo gizmo registram snapshots anterior e posterior e podem ser desfeitas/refeitas.
- Comandos antigos que só possuem undo continuam desfezíveis; não anunciam redo falso. Uma ação nova limpa a pilha de redo.
- Histórico limitado a 100 entradas e sincronização dos botões após os comandos.
- A restauração de hierarquia agora recoloca o nó explicitamente no pai/índice original.

Testes adicionados/fortalecidos: sequência de undo/redo reversível, ação legada só com undo, limpeza de redo após nova ação e proteção contra sobrescrita dos handlers. A auditoria estrutural valida sintaxe e os marcadores desse contrato.

Sincronização Android pendente nesta entrega: a fonte character.html está atualizada, mas a entrada Base64 character de index.html ainda corresponde a uma cópia anterior. A atualização foi deliberadamente bloqueada porque não foi possível calcular e conferir a conversão Base64 neste ambiente. O CI de APK não deve ser considerado prova da nova versão até a sincronização ser concluída.

Limite funcional: o undo das ações legadas foi unificado, mas essas ações ainda não possuem redo individual. O redo real está implementado para os comandos que já fornecem callback de reaplicação (hierarquia e transformação por gizmo).

## Correção adicional — sem redo fictício (13/11/2026)

Na revisão do histórico unificado foi detectado que ações legadas sem callback de reaplicação estavam sendo registradas com uma função vazia de redo. Isso fazia o comando aparecer como refezível mesmo sem restaurar seu efeito.

Correção:
- Ações legadas são registradas com `redo: null`.
- Undo só envia para a pilha de redo comandos que possuem callback real de reaplicação.
- Redo rejeita comandos sem callback executável.
- O teste de histórico verifica que uma ação antiga continua desfazível, mas não entra na pilha de redo e não pode anunciar sucesso ao refazer.

A sincronização entre `character.html` e a entrada Base64 em `index.html` será refeita e conferida byte a byte antes de gerar/aceitar novo APK.


## Correção adicional — rollback de reparenting (13/11/2026)

A revisão também identificou que uma tentativa de associação rejeitada após a decomposição de matriz podia restaurar o pai anterior, mas deixar posição/rotação/escala locais parcialmente alteradas.

Correção:
- Captura explícita de posição, quaternion, Euler e escala locais antes da tentativa.
- Em caso de falha, restaura o pai e o índice originais, ou remove do destino quando o nó não tinha pai.
- Restaura todos os componentes TRS e atualiza a matriz após o rollback.
- Auditoria e teste estrutural verificam a presença do snapshot e da restauração.
