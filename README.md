# Nyra Android

Versão Android em desenvolvimento do **Nyra 3D Studio**, baseada exclusivamente nos dois arquivos de referência definidos no projeto:

- `Nyra_3D_Studio_Teste_Integrado_v3.html`
- `three.js-master.zip`

## O que está implementado nesta etapa

- O HTML integrado original permanece como fonte dos três editores: Oficina de Itens, Criador de Personagens e RoboTV/Animação.
- As dependências essenciais Three.js 0.186.1 e JSZip 3.10.1 são empacotadas dentro do APK durante o build.
- O build verifica hashes dos módulos Three.js para detectar alterações inesperadas nos arquivos empacotados.
- A página integrada redireciona os imports CDN usados pelos editores para arquivos locais do aplicativo.
- O Android WebView usa um endereço de assets local compatível com módulos ES.
- O seletor de arquivos do Android é ligado aos campos de importação dos editores.
- Os downloads gerados pelos editores são encaminhados para o seletor de salvamento do Android.
- Há rascunhos locais automáticos para a Oficina de Itens, para projetos JSON do Criador de Personagens e para a animação RoboTV.
- Os imports de `.bbmodel` têm uma ressalva intencional: para evitar perder textura/metadados que o rascunho JSON não representa, o app não sobrescreve esse estado com JSON incompleto. Ao reabrir, é necessário reimportar o arquivo `.bbmodel`.
- A compilação cloud roda auditoria estática de controles/funções essenciais, verificação sintática dos scripts JS e auditoria dos arquivos locais dentro do APK.

## Estado verificado

O workflow **Nyra Android Cloud Build** compilou com sucesso e o teste de conteúdo do APK confirmou a presença de:

- HTML integrado dos editores;
- `three.module.js`, `three.core.js`, `OrbitControls.js` e `TransformControls.js`;
- JSZip e arquivos de licença.

**Limite importante:** o build e as auditorias de conteúdo passaram, mas isso não equivale a testar interação real de WebGL, importação, exportação e salvamento em um telefone físico. Essa etapa de validação em dispositivo ainda é necessária.

## Baixar o APK de depuração

Abra [GitHub Actions](https://github.com/SirAlvin9266/nyra-android/actions), selecione a execução bem-sucedida mais recente, e baixe o artefato `nyra-android-debug-apk`. O ZIP contém `app-debug.apk`. O artefato de depuração não é uma versão de lançamento assinada para distribuição pública.

## Arquivos de apoio

- [Regras dos arquivos de referência](REFERENCE_FILES.md)
- [Fonte integrada adaptada ao Android](android/app/src/main/assets/www/index.html)
- [Auditoria de funções e scripts](android/scripts/audit_reference.py)
- [Auditoria de conteúdo do APK](android/scripts/audit_apk.py)
