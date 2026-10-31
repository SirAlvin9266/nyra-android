# Nyra Android

Versão Android em desenvolvimento do **Nyra 3D Studio**, baseada exclusivamente nos dois arquivos de referência definidos no projeto:

- `Nyra_3D_Studio_Teste_Integrado_v3.html`
- `three.js-master.zip`

## Funcionalidades presentes no código

- Os três editores originais continuam integrados: Oficina de Itens, Criador de Personagens e RoboTV/Animação.
- Three.js 0.186.1 e JSZip 3.10.1 são empacotados no APK; os imports dos editores usam os assets locais e os hashes dos arquivos são verificados no build.
- O WebView Android oferece seletor nativo de arquivos e salvamento pelo seletor de documentos.
- Há rascunhos locais automáticos para a Oficina de Itens, projetos JSON do Criador de Personagens e RoboTV.
- O controle de escala do editor vai de 40% a 150%, com modo de viewport ampliado e zoom por pinça do Android. A interação visual e o alcance de rolagem ainda precisam de verificação em aparelho.
- O Criador de Personagens permite navegar pela hierarquia importada, selecionar componentes, excluir peças e restaurar a última exclusão.
- O gerador matemático JSON DSL v1 valida IDs, hierarquia, ciclos, vetores, dimensões, cores e cria grupos, pivôs e formas box/sphere/cylinder/cone.
- A importação de GLB/glTF, OBJ, FBX e STL e a exportação de GLB, OBJ e STL estão integradas ao Criador de Personagens.
- O importador dedicado de `.bbmodel` reconhece cubos, malhas personalizadas, grupos/outliner, UVs por face/canto, texturas incorporadas e converte canais de rotação, posição e escala compatíveis em clips de animação Three.js.
- O importador Blockbench mostra a contagem de cubos/malhas importados e avisa quando o arquivo tem pelo menos 32 MiB, devido à pressão de memória em dispositivos móveis.

## Validação automatizada

A execução [#142](https://github.com/SirAlvin9266/nyra-android/actions/runs/41226771370) concluiu com sucesso as auditorias dos editores, dos adaptadores gerados e do gerador matemático, além de compilar o APK e conferir os recursos empacotados.

O fluxo também possui o teste automatizado `audit_bbmodel_import.cjs`, que exercita fixtures sintéticas para cubos com UV/rotação animada, malhas trianguladas com grupos de materiais, um modelo Hytale e rejeição de um modelo inválido. A execução #142 foi feita antes da última alteração de aviso para arquivos grandes; a execução dessa alteração está registrada na branch separadamente.

## Compatibilidade e limites que ainda precisam de validação

- Os testes Blockbench atuais são fixtures sintéticas; os três arquivos reais enviados (cadeira Hytale, escudo de malhas e Kintsugi Bedrock) ainda precisam ser abertos no editor e conferidos visualmente no Android.
- O shield usa malhas personalizadas; a conversão foi criada para esse formato, mas requer validação visual de winding/normais, UV e orientação.
- A conversão de animações Blockbench atende canais compatíveis de posição/rotação/escala; não é uma conversão integral de todas as interpolações/eventos/animações especiais. A integração dos clips importados diretamente à timeline RoboTV ainda não está concluída.
- O importador atualmente carrega imagens incorporadas como data URI. Texturas externas que não estejam embutidas podem aparecer com material de fallback.
- Ainda não há exportador Blockbench de ida e volta comprovado. A saída comum disponível é GLB/OBJ/STL, cada formato com suas limitações.
- OBJ não representa sozinho materiais/texturas/hierarquia/animação; STL é geometria sem UV/material; as exportações devem ser conferidas conforme o formato.
- O GLB enviado tem aproximadamente 74 MB, portanto o aviso de memória é intencional. A importação real em aparelho permanece pendente.
- A Oficina de Itens e exportação de add-on Bedrock precisam de teste no Minecraft; o fluxo de dados e texturas entre todos os editores também precisa de integração funcional comprovada.
- NURBS, point clouds, voxels, guia interativo e identidade visual Android permanecem como ideias/fases futuras, não como recursos concluídos.

## Estado de release

A branch `work/nyra-all-ideas-integration` mantém as alterações fora da `main`. O PR #3 continua em rascunho. O CI verde comprova verificações estáticas, testes unitários do DSL/importador, compilação do APK e auditoria dos assets; não comprova a experiência de uso em telefone físico.

O APK de depuração pode ser baixado pelo artefato `nyra-android-debug-apk` na execução do GitHub Actions. Não é um APK de lançamento assinado para distribuição pública.

## Instruções de modelos matemáticos

Consulte [NYRA_MODEL_DSL.md](NYRA_MODEL_DSL.md) para o formato JSON, exemplos, hierarquia, pivôs, validações e limitações atuais.

## Arquivos de apoio

- [Regras dos arquivos de referência](REFERENCE_FILES.md)
- [Fonte integrada adaptada ao Android](android/app/src/main/assets/www/index.html)
- [Auditoria de funções e scripts](android/scripts/audit_reference.py)
- [Auditoria de conteúdo do APK](android/scripts/audit_apk.py)
