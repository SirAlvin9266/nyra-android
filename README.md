# Nyra Android

Versão Android em desenvolvimento do **Nyra 3D Studio**, baseada nos arquivos de referência do projeto e mantendo os três editores originais: Oficina de Itens, Criador de Personagens e RoboTV/Animação.

## O que está implementado na branch de integração

- Os três editores originais continuam incorporados, sem substituir suas áreas funcionais por um editor novo.
- Three.js 0.186.1 e JSZip 3.10.1 são empacotados localmente no APK; a preparação de dependências é versionada e verifica hashes.
- O WebView Android usa o seletor nativo de documentos para importar arquivos e o seletor de salvamento para exportar; seleções múltiplas tratam ClipData e URI individual sem duplicar arquivos.
- Há rascunhos locais automáticos para Oficina de Itens, Criador de Personagens e RoboTV.
- O zoom da interface vai de 40% a 150%, com zoom por pinça e modo desktop opcional que dimensiona um layout lógico de 1280 px. O comportamento visual, os toques, a rolagem, a orientação e o desempenho ainda precisam de validação em aparelho físico.
- O Criador de Personagens oferece árvore de componentes, seleção individual, transformação e exclusão/restauração da última peça excluída.
- O gerador matemático JSON DSL v1 valida IDs, hierarquia, ciclos, vetores, dimensões, cores e cria grupos, pivôs e formas box/sphere/cylinder/cone.
- A importação de GLB/glTF, OBJ, FBX, STL e .bbmodel e a exportação de GLB, OBJ e STL estão integradas ao Criador de Personagens.
- O importador Blockbench reconhece cubos, malhas livres, grupos/outliner, UVs, texturas incorporadas, imagens externas selecionadas junto com o arquivo e canais compatíveis de animação.
- A associação de imagem externa é conservadora: prioriza caminho exato e só usa fallback de nome quando a correspondência é única; se faltar ou houver ambiguidade, o editor avisa e utiliza material de fallback.
- A troca de modelo é transacional: o novo objeto é preparado, enquadrado e selecionado antes de descartar o modelo anterior. Uma falha durante a preparação tenta restaurar seleção, câmera e controles anteriores.
- O GLB passa por pré-análise de cabeçalho, versão, tamanho declarado, chunk JSON, contagem de vértices/triângulos, malhas, imagens, texturas e materiais antes da leitura integral. Arquivos grandes exibem estimativa de memória e pedem confirmação antes do carregamento.
- O guia interativo utiliza a arte local do Nyra, explica as áreas dos três editores e apresenta como solicitar a uma IA externa um JSON compatível com a DSL, sem pressupor que exista uma IA integrada.
- O manifesto Android aponta para ícones adaptativos normal e redondo usando a arte original enviada para a identidade visual.

## Testes automatizados e fixtures

O workflow executa a auditoria dos editores de referência, a auditoria dos adaptadores gerados, os testes do DSL matemático, os testes do importador Blockbench, a pré-análise GLB, a compilação Android e a verificação dos recursos dentro do APK.

A suíte Blockbench contém fixtures sintéticas para cubos/UV, hierarquia e animação, malhas livres com triangulação e grupos de materiais, formato Hytale, texturas externas e modelos inválidos. Também contém o arquivo real spartan_shild_editavel.bbmodel como fixture de regressão: quatro malhas livres, 1.736 vértices de origem, 898 faces triangulares e uma textura incorporada. O teste confirma a criação de quatro malhas, UVs e materiais com textura e ausência de aviso de textura ausente.

A suíte GLB verifica assinatura, versão, tamanho declarado, chunk JSON e métricas estruturais, incluindo rejeição de cabeçalho/chunk inválidos. Ela não substitui abrir o GLB de 73,8 MB no WebView de um aparelho.

## Diagnóstico dos modelos reais enviados

| Arquivo | Estrutura identificada | Estado atual |
|---|---|---|
| spartan_shild_editavel.bbmodel | Blockbench free, 4 malhas, 1.736 vértices, 898 faces triangulares, textura PNG incorporada | Fixture real adicionada ao CI; validação visual no Android pendente |
| chinese-armchair.bbmodel | Hytale prop, 67 cubos, 1 textura | Estrutura analisada; teste visual/importação no Android pendente |
| kintsugi.bbmodel | Bedrock, 38 cubos, 24 grupos, 28 animações, 1 textura | Estrutura analisada; teste visual/animação no Android pendente |
| Assassino de Olho Rubro GLB | 73,8 MB, 1 malha/primitiva, 1.225.149 vértices, 2.280.816 triângulos, 3 texturas/imagens, 1 material, sem esqueleto/animações | Pré-análise estrutural adicionada; importação real em aparelho ainda não comprovada |

O GLB grande é deliberadamente tratado como um caso de risco de memória. O usuário pode cancelar antes de iniciar a carga; a cena anterior não deve ser substituída até que o candidato tenha sido preparado. Mesmo assim, um processo de WebView pode ser encerrado pelo sistema por falta de memória, portanto a validação em um aparelho real continua obrigatória.

## Limites conhecidos, sem declarar conclusão indevida

- O modo desktop e a interface tátil precisam de validação física em diferentes tamanhos/orientações.
- O importador Blockbench precisa de inspeção visual de orientação, normais, UV, materiais e pivôs dos três modelos reais. O escudo tem fixture de regressão, mas isso não equivale a inspeção no telefone.
- O Kintsugi contém 28 animações; a conversão atual cobre canais compatíveis, não todas as semânticas/interpolações/eventos possíveis. A integração completa dos clips importados na timeline RoboTV ainda não está validada.
- O DSL v1 documentado suporta group, box, sphere, cylinder e cone, com limite de 500 componentes. Ainda não gera automaticamente cubos Blockbench, esqueleto, texturas pintadas ou UVs personalizados. As cinco especificações de modelos citadas no registro geral não aparecem detalhadas nos arquivos de planejamento recuperados; não foram inventadas nem declaradas concluídas.
- A interoperabilidade de texturas e projetos entre Oficina de Itens, Criador de Personagens e RoboTV ainda precisa de teste funcional completo.
- A exportação de add-on Bedrock precisa ser aberta e testada no Minecraft Bedrock; a compilação do pacote, sozinha, não comprova compatibilidade.
- NURBS, point clouds e voxels permanecem temas de investigação futura.
- A integração do ícone e da arte do guia está no código/recursos; a aparência final do launcher e do guia ainda precisa de conferência em diferentes launchers/dispositivos.

## Estado de release

As alterações ficam isoladas na branch work/nyra-all-ideas-integration e no PR #3. A branch main não foi mesclada nem alterada por esta execução. O PR permanece em rascunho até que a bateria automatizada e os ensaios em aparelho estejam completos.

Um CI verde comprova as verificações automatizadas, os testes disponíveis, a compilação do APK e a auditoria dos assets; não comprova renderização, memória, toques ou exportações no telefone. O APK de depuração pode ser baixado pelo artefato nyra-android-debug-apk na execução do GitHub Actions. Não é uma versão assinada para distribuição pública.

## Documentação complementar

- DSL de modelos matemáticos: NYRA_MODEL_DSL.md
- Regras dos arquivos de referência: REFERENCE_FILES.md
- Fonte integrada adaptada ao Android: android/app/src/main/assets/www/index.html
- Auditoria dos editores de referência: android/scripts/audit_reference.py
- Auditoria dos adaptadores: android/scripts/audit_generated_adapters.cjs
- Auditoria Blockbench: android/scripts/audit_bbmodel_import.cjs
- Teste de pré-análise GLB: android/scripts/audit_glb_preflight.cjs
- Auditoria de conteúdo do APK: android/scripts/audit_apk.py
