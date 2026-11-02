# Nyra 3D Studio — Registro de execução técnica (branch Android)

Data da execução: 2 de novembro de 2026

Branch de trabalho: work/nyra-all-ideas-integration  
Pull request: https://github.com/SirAlvin9266/nyra-android/pull/3  
Regra de segurança: nenhuma alteração foi feita na branch main e o PR permanece em rascunho.

## 1. Alterações aplicadas nesta execução

### Seletor de arquivos Android
- O retorno do seletor trata ClipData e URI individual.
- A lista de arquivos é unificada sem duplicar URIs.
- Arquivo: android/app/src/main/java/com/nyra/studio/MainActivity.java
- O filtro de MIME rejeita CR/LF reais no cabeçalho, não a sequência textual literal.

### Importação de modelos
- A troca do modelo passou a ser transacional: preparar, enquadrar e selecionar o candidato antes de remover e liberar o modelo anterior.
- Em falha na preparação, tenta restaurar câmera, alvo dos controles e seleção anteriores.
- A associação de texturas externas dá preferência a caminhos exatos e só usa fallback por nome se o basename resultar em uma correspondência única.
- A tela apresenta contagem de malhas/elementos de modelos Blockbench.
- Arquivo: android/app/src/main/assets/www/index.html.

### Pré-análise GLB
- Valida a assinatura, versão glTF 2.0, tamanho declarado e primeiro chunk JSON.
- Conta vértices, triângulos, primitivas, malhas, imagens, texturas e materiais com base nos accessors e na estrutura do JSON.
- Calcula uma estimativa conservadora de memória e solicita confirmação para arquivos muito grandes/complexos.
- A confirmação não garante que o Android tenha memória suficiente; ela permite ao usuário cancelar antes da alocação integral.
- Arquivo: android/app/src/main/assets/www/index.html.
- Teste dedicado: android/scripts/audit_glb_preflight.cjs.

### Fixture real do escudo
- Incluído android/scripts/fixtures/spartan_shild_editavel.bbmodel.
- O arquivo real tem modelo Blockbench no formato free, quatro malhas, 1.736 vértices de origem, 898 faces triangulares e uma textura incorporada.
- O teste executa parseBBModel sobre o fixture e verifica malhas, UVs, materiais, contagem e ausência de aviso de textura ausente.
- Arquivo de teste: android/scripts/audit_bbmodel_import.cjs.

### Guia e identidade visual
- O espaço reservado do guia foi trocado pela arte Nyra otimizada e empacotada em assets locais.
- O guia apresenta os três editores, a importação/hierarquia e como solicitar a uma IA externa um JSON compatível com o DSL v1.
- O Manifest aponta para ícones adaptativos normal e redondo, com foreground e fundo de cor definidos em resources.
- O APK audit verifica a presença e a assinatura WebP dos recursos.
- Arquivos: AndroidManifest.xml, res/drawable-nodpi/nyra_adaptive_foreground.webp, res/mipmap-anydpi-v26/*.xml, res/values/nyra_launcher.xml, assets/www/nyra-guide-robot.webp, android/scripts/audit_apk.py.

### Auditorias/CI
- audit_reference.py mantém a checagem de um único fechamento literal do script externo e fechamentos escapados dos módulos embutidos.
- audit_generated_adapters.cjs foi atualizado para exigir a seleção transacional do objeto candidato em vez da chamada antiga de seleção.
- O workflow inclui audit_glb_preflight.cjs.
- README atualizado para descrever o que foi implementado e o que continua pendente.

## 2. Diagnóstico dos modelos reais enviados

| Arquivo | Diagnóstico estrutural |
|---|---|
| spartan_shild_editavel.bbmodel | Formato free; 4 elementos mesh; 1.736 vértices; 898 faces; textura PNG incorporada. Foi adicionado como fixture do CI. |
| chinese-armchair.bbmodel | Formato hytale_prop; 67 elementos cube; 1 textura. A análise estrutural foi realizada, mas não foi incorporado ao CI porque o arquivo não estava disponível como texto estruturado no leitor de projeto; permanece como ensaio real pendente. |
| kintsugi.bbmodel | Formato bedrock; 38 elementos cube; 24 grupos; 1 textura; 28 animações. A análise estrutural foi realizada, mas não foi incorporado ao CI porque o arquivo não estava disponível como texto estruturado no leitor de projeto; permanece como ensaio real pendente. |
| Assassino de Olho Rubro GLB | 73,8 MB; GLB v2; tamanho declarado confere; 1 malha/primitiva; 1.225.149 vértices; 2.280.816 triângulos; 3 texturas/imagens; 1 material; sem esqueleto ou animações. A estrutura do arquivo foi lida; importação real no Android não comprovada. |

## 3. Estado de validação

| Item | Estado |
|---|---|
| Correção do retorno de múltiplas URIs Android | Implementada; aguarda compilação/CI |
| Importação transacional de modelo | Implementada; teste do fluxo no WebView/dispositivo pendente |
| Associação conservadora de texturas externas | Implementada; teste físico em Android pendente |
| GLB preflight | Implementado; teste automatizado novo aguarda CI |
| Fixture real do escudo | Adicionada ao teste automatizado; aguarda resultado CI |
| Arte do guia e ícones adaptativos | Recursos e referências no manifesto adicionados; build e aparência física pendentes |
| DSL Matemático v1 | Implementado anteriormente; escopo conhecido e testes já existentes |
| Guia interativo | Conteúdo e artwork integrados; verificar layout no telefone |
| Modo desktop e zoom | Implementação anterior preservada; verificação física pendente |
| Cadeira chinesa e Kintsugi | Estrutura analisada; teste de importação no telefone pendente |
| GLB Assassino | Estrutura analisada e preflight implementado; importação em aparelho pendente |
| Exportação Bedrock e fluxo cross-editor de texturas | Pendente de teste funcional no Minecraft e nos três editores |

## 4. Limites técnicos e decisões de honestidade

- Uma auditoria estática ou CI verde não demonstra que um WebView Android aguente renderizar o GLB de 73,8 MB. A carga pode exigir centenas de MiB de memória temporária e o sistema ainda pode encerrar o processo.
- O fixture sintético Blockbench não representa por completo todas as variantes reais do formato.
- O shield real entrou no teste automatizado; a cadeira e o Kintsugi não foram enviados ao CI nesta execução por limitação do leitor de arquivos binários, e não por falta de suporte declarado no importador.
- Os dados recuperados não identificam as especificações completas dos cinco modelos matemáticos. A DSL v1 documentada contém group/box/sphere/cylinder/cone; não declarar os cinco modelos atendidos antes de recuperar essas especificações.
- O ícone usa a arte adaptativa Nyra fornecida no pacote de identidade. O guia usa uma versão reduzida desta mesma arte; não foi encontrado, neste pacote, um recurso de personagem robô independente da marca.

## 5. Commits e CI

O histórico integral da branch pode ser consultado no PR #3. Os principais commits verificáveis desta execução incluem:
- 313a76ac68c2b4279446da0f80ea0c0f9bed9cbc — seletor Android/ClipData.
- 138c8716c34f45e9bb2f731fbc3aec2c1271d1f8 — fixture real do escudo.
- 6b642e8018bb2733d895410151a2d73c54ed6f61 — artwork e tutoriais do guia.
- d5e440f25ef28a1ae9b4e3ad55e744202a6687ae — teste estrutural GLB.
- 1cd7b10c9891b6fab0ea255e6dc752e00f517ae4 — ícones e recursos Nyra.
- f871d066ef4e087e023876c5c77dfba3a2ae10e8 — correção do fechamento de scripts embutidos.
- 0da21b2926205430097e86d134e872c95bb20de9 — auditoria alinhada ao fluxo transacional.
- 7e2716138ac625b80ea061af56c09af4dce7bdc2 — registro técnico inicial.

A primeira compilação de APK passou, mas a auditoria final identificou diferenças entre os caminhos de recursos-fonte e os recursos processados pelo Android Gradle Plugin. A auditoria foi ajustada para verificar os recursos compilados e as referências reais do manifesto. A nova execução precisa confirmar esse ajuste.

O PR permanece em rascunho. Mesmo com CI verde, a aprovação final depende da inspeção física de importação, memória, interface tátil, exportação e comportamento dos editores no Android.
