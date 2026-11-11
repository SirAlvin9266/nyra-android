# Nyra 3D Studio — Índice central do projeto

> **Ponto de entrada para continuidade entre conversas e agentes.**
> Antes de trabalhar no projeto, leia este arquivo e depois os documentos específicos da frente solicitada.
> Este índice aponta para registros existentes; ele não substitui o histórico das conversas nem os documentos técnicos.

## Como retomar

Quando uma conversa nova precisar continuar o desenvolvimento, use uma instrução como:

> Continue a **Frente D** da Nyra. Consulte primeiro o `INDICE_DO_PROJETO.md` na raiz do repositório, leia os documentos vinculados à Frente D, confira o estado real do código e das branches e prossiga da próxima etapa ainda não concluída. Não refaça o planejamento nem assuma que algo está validado sem evidência.

**Repositório:** [SirAlvin9266/nyra-android](https://github.com/SirAlvin9266/nyra-android)  
**Branch padrão verificada na criação deste índice:** `main`

## Regras de continuidade e integridade

1. Leia este índice antes de iniciar uma tarefa de desenvolvimento.
2. Consulte os documentos vinculados à frente em questão e considere também decisões registradas nas conversas; os documentos podem não conter todo o histórico das ideias.
3. Antes de alterar código, confira a branch atual, o estado do repositório, commits recentes, PRs e CI relevantes.
4. Não confunda **planejado**, **implementado**, **testado automaticamente**, **validado em dispositivo** e **validado no aplicativo/jogo de destino**. Registre cada nível separadamente.
5. Não marque uma etapa como concluída sem evidência verificável. CI verde, testes estáticos e inspeção de arquivos não substituem validação funcional real.
6. Preserve recursos existentes e decisões registradas. Não remova ou substitua funcionalidades para simplificar a implementação sem justificar e registrar a mudança.
7. Se uma decisão técnica realmente estiver em aberto, investigue-a. Não crie planejamento redundante quando a próxima ação já estiver definida.
8. Atualize este índice e os registros da frente após mudanças relevantes, incluindo links de commits, PRs, testes e limitações descobertas.
9. Quando uma conversa for interrompida por limite, a conversa seguinte deve retomar do estado documentado no GitHub, verificando primeiro se houve novos commits ou mudanças desde a última atualização.

## Mapa do projeto

| Área | Documento principal | Finalidade |
|---|---|---|
| Visão geral e estado descrito do aplicativo | [README.md](README.md) | Resumo de editores, recursos descritos, testes e limitações |
| Registro de validação/integração | [NYRA_VALIDACAO_INTEGRACAO.md](NYRA_VALIDACAO_INTEGRACAO.md) | Histórico técnico de execução, fixtures, testes e pendências |
| Referências de arquivos | [REFERENCE_FILES.md](REFERENCE_FILES.md) | Relação de arquivos de referência do projeto |

## Frente D — prioridade antes da Frente B

**Objetivo:** integração de modelos, animação, importação e exportação, com foco em modelos de entidade Minecraft Bedrock/Blockbench e no fluxo RoboTV/Animação. Os controles de importação e exportação precisam existir também dentro da própria área de Animação; não basta deixá-los no rodapé do editor geral.

### Documentos da Frente D

1. [Plano técnico detalhado](NYRA_FRENTE_D_PLANO_TECNICO_DETALHADO.md) — plano de arquitetura, importação, documento canônico, conversões, animação, exportação e validação.
2. [Pesquisa e plano ampliado](NYRA_FRENTE_D_PESQUISA_E_PLANO_AMPLIADO.md) — pesquisa e decisões arquiteturais complementares.
3. [Revisão completa: perguntas e implementação](NYRA_FRENTE_D_REVISAO_COMPLETA_PERGUNTAS_E_IMPLEMENTACAO.md) — revisão dos tópicos, importância, implementação, alternativas e estado planejado.
4. [Animação e integração Blockbench](NYRA_FRENTE_D_ANIMACAO.md) — requisitos específicos de RoboTV, clips, hierarquia, pivôs e testes de animação.
5. [DSL do modelo matemático](NYRA_MODEL_DSL.md) — especificação conhecida do DSL v1 e seus limites atuais.

### Estado conhecido da Frente D

- **Planejamento:** documentado nos arquivos acima.
- **Importador Blockbench:** o README descreve reconhecimento de cubos, malhas, grupos/outliner, UVs, texturas e canais compatíveis de animação. Isso não significa suporte integral a todas as variantes do formato.
- **RoboTV/timeline:** a integração completa dos clips importados permanece registrada como pendente de integração/validação.
- **Exportação Bedrock:** não tratar como concluída ou comprovada; exige validação do schema/versão-alvo e teste real no Minecraft Bedrock.
- **Modelos de referência:** o registro técnico menciona o Kintsugi com 28 animações e outras fixtures; consultar os documentos de execução para saber quais testes estão efetivamente automatizados.
- **Ordem:** executar a Frente D antes da Frente B, conforme decisão registrada.

### Próxima etapa prevista

**D1 — auditoria do código real.** Antes de implementar, inspecionar a branch e os arquivos atuais para mapear o que existe, o que é reutilizável, o que está incompleto e o que falta. A auditoria deve gerar evidências concretas (arquivos, funções, testes e estado de CI) e não apenas outro documento genérico de planejamento.

## Registro de execução e validação

Consulte [NYRA_VALIDACAO_INTEGRACAO.md](NYRA_VALIDACAO_INTEGRACAO.md) antes de interpretar estados antigos. Ele contém um registro datado de execução e separa alterações aplicadas, diagnósticos estruturais e itens aguardando CI ou ensaio físico. Como o repositório pode ter avançado desde a data desse registro, sempre confira commits, PRs e workflows atuais.

## Como manter este índice

Ao concluir uma etapa ou fazer uma alteração material:
- atualize o estado da frente correspondente;
- registre o commit/PR e o branch onde a mudança está;
- informe exatamente quais testes rodaram e seus resultados;
- indique o que ainda aguarda teste em Android/WebView ou Minecraft Bedrock;
- ajuste a próxima etapa para a primeira pendência real;
- mantenha os documentos técnicos detalhados como fonte de especificação, evitando duplicar todo o conteúdo aqui.

---

*Este índice foi criado para facilitar a localização e continuidade do trabalho. Ele não declara qualquer funcionalidade como concluída apenas por estar planejada ou descrita.*
