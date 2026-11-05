# Nyra 3D Studio — Guia interativo completo

O guia do robô é a documentação de uso do aplicativo. O conteúdo não deve ser reduzido a frases de apresentação: cada etapa explica conceito, finalidade, procedimento, resultado esperado, limites e cuidados. A interface apresenta uma etapa por vez, com navegação numérica, anterior/próximo, destaque do controle correspondente e estados honestos.

## Estrutura e conteúdo
O guia contém 23 etapas:
1. Orientação geral e estados dos recursos.
2–3. Oficina de Itens: finalidade, canvas, textura, paleta, exportação.
4. Criador de Personagens: objetos, grupos e malhas.
5. Primitivas geométricas.
6. Transformações e hierarquia.
7–8. DSL matemática v1, validação, IDs, dimensões e limites.
9–10. Importação unificada e compatibilidade Blockbench.
11. Árvore de componentes e seleção.
12. As nove visões de inspeção.
13–15. Exportação GLB/OBJ/STL/BBModel, validação interna e limitações.
16. UVs, materiais e texturas.
17–18. RoboTV, rig, poses, keyframes e limites de animação.
19–20. Salvamento, rascunhos, backup, desfazer e operações destrutivas.
21. Desempenho de modelos grandes e métricas relevantes.
22. Como usar o robô como documentação, inclusive o fallback.
23. Separação da Frente B e retorno ao guia.

## Regras editoriais
- Cada etapa deve ser explicativa e operacional, não só um resumo.
- Não prometer recursos que não existem.
- Descrever as diferenças entre objeto/grupo/malha e a ausência atual de topologia editável.
- Não confundir rascunho local com backup externo.
- Diferenciar conversão/exportação e declarar limites.
- Usar os alvos reais da interface; se não houver alvo específico, destacar a área principal do editor.
- O modelo 3D é visual; texto e navegação devem continuar funcionando quando WebGL falhar.

## Robô
Fonte: `docs/sources/nyra_personagem.json`.
O projeto Character+Voxel v4 define seis partes com transforms e cores. Como `voxels` e `objects` estão vazios, a visualização utiliza primitivas geométricas proxy construídas a partir da especificação. Essas caixas não devem ser descritas como um personagem final de voxel-art ou como malha fornecida pelo arquivo original.
## Formatos JSON — distinção obrigatória
- O botão Exportar modelo JSON grava o formato de cena editada Nyra Scene Project v1. Ele serializa hierarquia, transforms, malhas (posições/índices/UVs/normais/grupos) e propriedades básicas de material. Não deve ser descrito como exportador Character+Voxel v4 nem como pacote com imagens binárias de textura.
- O importador também aceita projetos Character+Voxel v4 e converte as partes estruturais disponíveis em peças proxy. O arquivo oficial atual ainda tem arrays voxels e objects vazios.
- Para preservar recursos gráficos externos, mantenha seus arquivos auxiliares junto do projeto; JSON Scene Project v1 ainda não incorpora imagens de textura como payload autossuficiente.

## Cache Android — limite deliberado de segurança
Os controles Estado do cache temporário e Limpar temporários seguros consultam e limpam somente o diretório privado nyra-rebuildable, utilizado para arquivos temporários de exportação. A limpeza é recusada enquanto houver exportação, fila de salvamento ou seletor nativo ativo. Não remove projetos do usuário, rascunhos do WebView, nem o cache geral do aplicativo. O diretório não é um gerenciador de projetos nem uma biblioteca de assets reconstruíveis de cenas.

## C4 — leitura do diagnóstico
O relatório contém tempo total e eventos de leitura/parse por formato (GLB/glTF, OBJ, FBX, STL, JSON e BBModel), além das métricas de cena/renderização já disponíveis. Uma medição automatizada não substitui o benchmark no mesmo aparelho. O caso de aproximadamente 25 MB deve ser repetido no dispositivo de referência para separar leitura, parse e construção/renderização da cena.
