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
