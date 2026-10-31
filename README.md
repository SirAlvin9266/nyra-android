# Nyra Android

Versão Android em desenvolvimento do **Nyra 3D Studio**, baseada exclusivamente nos dois arquivos de referência definidos no projeto:

- `Nyra_3D_Studio_Teste_Integrado_v3.html`
- `three.js-master.zip`

## Funcionalidades presentes no código

- Os três editores originais continuam integrados: Oficina de Itens, Criador de Personagens e RoboTV/Animação.
- Three.js 0.186.1 e JSZip 3.10.1 são empacotados no APK; os imports dos editores usam os assets locais e os hashes dos arquivos são verificados no build.
- O WebView Android oferece seletor nativo de arquivos e salvamento pelo seletor de documentos.
- Há rascunhos locais automáticos para a Oficina de Itens, projetos JSON do Criador de Personagens e RoboTV.
- O zoom da interface vai de 40% a 150%, com zoom por pinça do Android e um modo desktop opcional que escala um layout lógico de 1280 px para caber na tela. O comportamento visual, os toques e a rolagem ainda precisam de validação em aparelho físico.
- O Criador de Personagens permite navegar pela hierarquia importada, selecionar componentes, excluir peças e restaurar a última exclusão.
- O gerador matemático JSON DSL v1 valida IDs, hierarquia, ciclos, vetores, dimensões, cores e cria grupos, pivôs e formas box/sphere/cylinder/cone.
- A importação de GLB/glTF, OBJ, FBX e STL e a exportação de GLB, OBJ e STL estão integradas ao Criador de Personagens.
- O importador dedicado de `.bbmodel` reconhece cubos, malhas personalizadas, grupos/outliner, UVs por face/canto, texturas incorporadas e canais compatíveis de animação. Também procura imagens externas selecionadas junto com o `.bbmodel`; quando não encontra a imagem referenciada, aplica material de fallback e mostra um aviso.
- O importador Blockbench mostra a contagem de cubos/malhas importados e avisa quando o arquivo tem pelo menos 32 MiB, devido à pressão de memória em dispositivos móveis.

## Validação automatizada

A execução [#160](https://github.com/SirAlvin9266/nyra-android/actions/runs/41228356821) concluiu com sucesso as auditorias dos editores e adaptadores, os testes do DSL matemático e do importador Blockbench, a compilação do APK e a verificação dos recursos empacotados.

O fluxo inclui `audit_bbmodel_import.cjs`, com fixtures sintéticas para cubos com UV/rotação animada, malhas trianguladas com grupos de materiais, formato Hytale, rejeição de modelos inválidos, correspondência de texturas externas e avisos quando a imagem não está disponível. A execução #160 valida a versão com carregamento de texturas externas.

## Compatibilidade e limites que ainda precisam de validação

- Os testes Blockbench atuais são fixtures sintéticas; os três arquivos reais enviados (cadeira Hytale, escudo de malhas e Kintsugi Bedrock) ainda precisam ser abertos no editor e conferidos visualmente no Android.
- O shield usa malhas personalizadas; a conversão foi criada para esse formato, mas requer validação visual de winding/normais, UV e orientação.
- A conversão de animações Blockbench atende canais compatíveis de posição/rotação/escala; não é uma conversão integral de todas as interpolações/eventos/animações especiais. A integração dos clips importados diretamente à timeline RoboTV ainda não está concluída.
- Texturas incorporadas e imagens externas selecionadas junto com o `.bbmodel` são suportadas por correspondência de caminho/nome. Se o arquivo de imagem não for fornecido ou não puder ser associado com segurança, o editor avisa e usa material de fallback.
- Ainda não há exportador Blockbench de ida e volta comprovado. A saída comum disponível é GLB/OBJ/STL, cada formato com suas limitações.
- OBJ não representa sozinho materiais/texturas/hierarquia/animação; STL é geometria sem UV/material; as exportações devem ser conferidas conforme o formato.
- O GLB enviado tem aproximadamente 74 MB, portanto o aviso de memória é intencional. A importação real em aparelho permanece pendente.
- A Oficina de Itens e exportação de add-on Bedrock precisam de teste no Minecraft; o fluxo de dados e texturas entre todos os editores também precisa de integração funcional comprovada.
- NURBS, point clouds e voxels permanecem em investigação futura. O guia interativo e a integração final da identidade visual/ícones Android continuam pendentes.

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
