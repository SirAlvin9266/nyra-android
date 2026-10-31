# Nyra Android — arquivos de referência autorizados

Este projeto deve usar exclusivamente estes dois arquivos como fonte do código do editor:

1. `Nyra_3D_Studio_Teste_Integrado_v3.html` — arquivo integrado original, com os editores internos Oficina de Itens, Criador de Personagens e RoboTV/Animação.
2. `three.js-master.zip` — biblioteca Three.js fornecida para empacotamento local.

## Regras de integração

- Não usar protótipos anteriores do Nyra nem arquivos de outras versões como fonte de implementação.
- Preservar o conteúdo original dos três editores embutidos no HTML de referência. Alterações devem ser adaptadores explícitos para Android/dependências, nunca substituições silenciosas por outras implementações.
- O HTML integrado está em `android/app/src/main/assets/www/index.html` e mantém os três payloads embutidos extraídos do arquivo de referência.
- O HTML de referência mantém URLs CDN como marcadores de origem, mas o adaptador Android as reescreve para os assets locais empacotados. A auditoria dos documentos gerados verifica que as páginas finais não mantêm dependências CDN em runtime. Isso comprova a configuração estática, não o teste em aparelho sem rede.
- A integração de `three.js-master.zip` precisa identificar e incluir apenas os módulos necessários, observar a licença distribuída com Three.js e evitar incluir os 366 MB do ZIP inteiro.
- A compilação Android bem-sucedida prova apenas que a estrutura de empacotamento compila. Não comprova que os três editores funcionam em dispositivo real nem que todos os recursos de arquivo são compatíveis com WebView.

## Verificação inicial

- A linha de referência original tem 118.061 bytes.
- A cópia integrada no APK mantém três páginas embutidas codificadas em Base64, com comprimentos de 24.324, 58.980 e 30.464 caracteres.
- A auditoria das páginas internas decodificadas e dos adaptadores está automatizada. O Gradle obtém versões fixadas de Three.js 0.186.1 e JSZip 3.10.1 durante o build, confere hashes dos módulos usados e os empacota no APK; o aplicativo não deve depender de CDN em runtime. Ainda falta validar o uso offline e os editores em um aparelho físico.
