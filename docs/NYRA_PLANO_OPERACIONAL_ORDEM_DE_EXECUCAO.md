# Plano operacional ordenado — Nyra 3D Studio

Este plano organiza a execução da revisão integral em uma sequência única. Ele complementa o escopo amplo desta PR e o parecer técnico da Frente B.

## Proteções
- A Frente D permanece congelada e intocada. Não alterar arquivos, branches ou PRs dela.
- Não alterar `main` diretamente nem mesclar PRs automaticamente.
- Trabalhar nesta trilha de revisão em mudanças pequenas, isoladas e reversíveis.
- Não declarar correção visual/funcional sem evidência; separar análise estática de teste em aparelho.

## Ordem de execução

### 1. Fixar a linha de base e recuperar o estado real
- Confirmar branch/base/commit e mapear PRs e mudanças já existentes.
- Inventariar os três editores, shell, integração Android, ativos, dependências, build e testes.
- Distinguir fonte, conteúdo embutido/gerado e artefatos.
- Registrar o que funciona hoje e quais fluxos não podem regredir.
**Entrega/aceite:** inventário fonte-a-fonte e matriz de funcionalidades/fluxos existentes.

### 2. Auditar visual e funcionalmente a interface atual
- Catalogar todos os botões, menus, abas, ícones, campos, painéis e ações.
- Identificar duplicados, controles sem ação, ações inacessíveis, rótulos ambíguos e hierarquia ruim.
- Avaliar espaçamento, densidade, alinhamento, contraste, tipografia, tamanhos e áreas de toque.
- Mapear a navegação e tarefas comuns nos três editores.
- Separar problemas confirmados no código/runtime de pontos que dependem dos prints ou de aparelho físico.
**Entrega/aceite:** inventário de controles + lista priorizada de problemas com localização, evidência, impacto e comportamento esperado.

### 3. Definir a experiência visual e a organização das telas
- Definir hierarquia de ações, padrões de botões, ícones, estados e feedback.
- Definir espaçamentos, tipografia, cores semânticas, componentes e responsividade.
- Reorganizar as telas para reduzir repetição e liberar espaço sem remover capacidades úteis.
- Planejar barras contextuais, painéis, gavetas/abas e comportamento em telas pequenas.
**Entrega/aceite:** especificação visual e mapas de tela aprovados antes de redesenho amplo.

### 4. Corrigir os problemas de interface em lotes pequenos
- Corrigir primeiro controles quebrados e ações duplicadas.
- Em seguida corrigir navegação, hierarquia, espaçamento e responsividade.
- Aplicar componentes e estilos compartilhados sem tornar os três editores idênticos.
- Testar cada lote antes de avançar.
**Entrega/aceite:** cada controle inventariado tem ação definida, estado correto e teste; nenhuma capacidade existente é perdida.

### 5. Preparar a arquitetura para manter a interface
- Mapear acoplamentos entre shell e editores, HTML/Base64, adaptadores injetados e dependências internas.
- Definir contratos explícitos de inicialização, navegação, eventos, seleção, projetos, persistência e I/O.
- Modularizar por responsabilidades estáveis, extraindo conteúdo embutido sem alterar comportamento primeiro.
- Evitar reescrita total; migrar progressivamente e manter compatibilidade temporária.
**Entrega/aceite:** fronteiras e contratos documentados, extrações testadas e plano de migração reversível.

### 6. Estabilizar Android, projetos e arquivos
- Revisar WebView, ciclo de vida, ponte Java↔JavaScript, botão Voltar, teclado, seleção e exportação de arquivos.
- Unificar/clarificar persistência, recuperação, versionamento e tratamento de erros.
- Verificar importação/exportação, formatos, recursos, memória e descarte de objetos.
- Manter runtime offline e dependências verificáveis.
**Entrega/aceite:** fluxos de abrir, alternar, salvar, reabrir, importar e exportar testados; limitações documentadas.

### 7. Validar a base completa
- Executar testes automatizados, auditorias e build.
- Identificar APK pelo commit e SHA-256.
- Testar em aparelho físico: toque, rolagem, gestos, zoom, teclado, orientação, navegação, arquivos e recuperação.
- Registrar defeitos remanescentes e evidências.
**Entrega/aceite:** baseline estável e relatório de validação; CI não substitui teste físico.

### 8. Iniciar B0 — fundação de modelagem
- Definir documento de projeto versionado.
- Separar núcleo geométrico da UI e do renderer Three.js.
- Definir identidade topológica, geração de malha de renderização e mapeamento de seleção.
- Implementar comandos transacionais e undo/redo.
- Definir validação, limites de custo e fixtures de teste.
**Entrega/aceite vertical:** criar caixa → converter em malha editável → selecionar/mover vértice → desfazer/refazer → salvar/reabrir → exportar.

### 9. Desenvolver a Frente B em dependência real
- B1: consolidar primitivas paramétricas.
- B2/B3: topologia mínima e seleção de vértices, arestas e faces.
- B4: operações básicas de malha; booleanas somente em etapa posterior.
- B5/B6: superfícies, perfis, extrusão, loft e espessura.
- B7: construção manual de roupas/camadas; simulação física separada.
- B8/B9: expandir DSL e avaliar qualidade do gerador.
**Entrega/aceite:** cada bloco só começa quando seus pré-requisitos e testes estiverem estáveis.

## Critério para avançar
Não avançar por calendário ou por quantidade de funcionalidades. Avançar quando a entrega da etapa anterior tiver evidência, testes e limitações registradas.

## Estado atual
A PR já contém auditoria arquitetural e parecer técnico da Frente B. Isso ainda é documentação/análise; não significa que a auditoria visual completa, o redesenho, as correções ou a validação em aparelho estejam concluídos.