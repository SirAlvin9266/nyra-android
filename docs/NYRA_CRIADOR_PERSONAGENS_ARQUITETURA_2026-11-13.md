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
