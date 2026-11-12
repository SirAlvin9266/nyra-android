# NYRA — Revisão de produto, arquitetura e simplificação

> Documento de diagnóstico e proposta. Não é ordem para reescrever o aplicativo. A Frente D está congelada e fora do escopo.

## 1. Objetivo

Revisar a Nyra inteira como produto e como software. A questão principal não é apenas corrigir erros individuais: é descobrir por que a experiência e a base técnica parecem mais pesadas do que precisam ser, quais responsabilidades ficaram misturadas e como tornar o aplicativo mais simples de usar, manter e ampliar.

O objetivo não é remover HTML por princípio. HTML/CSS continuam adequados para interfaces e podem permanecer no WebView. O problema a investigar é o acúmulo de lógica, conteúdo e responsabilidades no mesmo documento, a montagem de telas via strings, a duplicação de estado e o acoplamento entre editores e shell.

## 2. Evidências observadas no baseline analisado

- Shell: `android/app/src/main/assets/www/index.html`, aproximadamente 206 KB e 378 linhas físicas muito extensas.
- O shell contém três documentos de editor como strings Base64, e também navegação, zoom, modo desktop, Guia, diagnóstico, persistência, inicialização de iframes, bridge de exportação e adaptadores.
- Payloads originais decodificados: Oficina ≈20 KB; Criador ≈50 KB; RoboTV ≈23 KB.
- O adaptador de importação/exportação 3D e DSL é uma string extensa dentro de `addAndroidExportAdapter`, que injeta painel e módulo de lógica no HTML do Criador.
- Java nativo: `MainActivity.java`, ≈17 KB / 403 linhas; reúne WebView, AssetLoader, callbacks de ciclo de vida, seletor SAF, transferências de exportação em blocos, limites de tamanho e URI.
- Gradle concentra preparação dos assets locais Three.js/JSZip com hashes.
- Há uma única Activity e uma única tela nativa no baseline, com grande parte da UI dentro do WebView.
- Os payloads da Oficina e RoboTV ainda têm estilos/scripts internos próprios; parte do shell duplica adaptação e persistência após o HTML original.
- Auditorias de referência e adaptadores precisam entender a estrutura/base64/strings de HTML para testar o aplicativo.

Esses dados indicam concentração de responsabilidades e dificuldade de inspeção. Não demonstram por si só que WebView ou HTML sejam tecnologias inadequadas.

## 3. Mapa arquitetural atual

```
Android Manifest / Gradle
  └── MainActivity
      ├── WebView + WebViewAssetLoader
      ├── interface JavaScript (NyraAndroid)
      │   ├── abrir documentos via SAF
      │   └── exportar blob em chunks para SAF
      └── carrega www/index.html
          ├── shell e estado global
          ├── editorItems (HTML Base64 → iframe srcdoc)
          │   ├── CSS de pixel art
          │   ├── matriz/paleta/ações
          │   └── persistência injetada
          ├── editorCharacter (HTML Base64 → iframe srcdoc)
          │   ├── Three.js / OrbitControls / TransformControls
          │   ├── edição e voxels
          │   ├── importação/exportação original BBModel/JSON
          │   ├── adaptação NyraModelIO injetada
          │   ├── DSL matemática injetada
          │   └── persistência injetada
          ├── editorAnimation (HTML Base64 → iframe srcdoc)
          │   ├── rig RoboTV fixo
          │   ├── timeline/keyframes/equipamentos
          │   └── persistência injetada
          └── Guia interativo
              ├── conteúdo e etapas
              └── imagem local do Robô TV
```

### Fluxos transversais identificados

- Importação: seletor Android → URIs/arquivos → iframe → parser Three.js/Blockbench.
- Exportação: editor cria Blob/anchor → bridge JavaScript → transferência por chunks → SAF → URI de destino.
- Persistência: editores têm chaves locais separadas e adaptadores injetados; o shell também persiste editor ativo/zoom e recebe mensagens de estado.
- Navegação: shell alterna iframes; cada contexto tem lifecycle JavaScript separado e acesso à sua própria janela/documento.

O mapa é estrutural, derivado do código atual; não prova que cada fluxo funcione em todos os aparelhos.

## 4. Principais fontes de complexidade a avaliar

### 4.1 HTML/Base64/HTML gerado

O shell armazena documentos HTML completos em Base64 e depois os decodifica para `iframe.srcdoc`. Além disso, um adaptador transforma strings do documento para injetar estilos, painéis, scripts e bridges. Isso:

- dificulta diff/revisão de alterações pequenas;
- prejudica busca por IDs/funções e ferramentas de análise;
- obriga auditorias a conhecer a codificação e os delimitadores da string;
- mistura template, runtime e transformação de código;
- aumenta o risco de fechar uma tag/script incorretamente;
- torna mais difícil rastrear a origem de um comportamento.

### 4.2 Responsabilidades excessivas no shell

O shell não apenas navega: também implementa zoom, modo desktop, guia, diagnóstico, armazenamento, adapter de arquivo e integrações 3D. Isso cria um ponto central com muitos motivos para mudar.

### 4.3 Adaptadores como geradores de código

`addAndroidExportAdapter` injeta HTML/CSS/JavaScript como string e possui conhecimento de detalhes internos dos editores. Isso cria acoplamento e aumenta o custo de testar módulos isoladamente.

### 4.4 Estado e persistência distribuídos

Cada editor mantém sua própria forma/chave de rascunho, enquanto o shell mantém preferências e recebe eventos. A revisão precisa definir:

- qual estado pertence a cada editor;
- o que é preferência global;
- o que constitui projeto persistente exportável;
- se recursos binários e referências externas podem ser restaurados;
- quais mensagens/eventos fazem parte de um contrato estável.

### 4.5 Fronteira Android/Web inconsistente

A Activity concentra acesso ao sistema de arquivos, mas a UI e muito do fluxo continuam dentro do WebView. Deve-se avaliar quais recursos exigem Android nativo e quais ficam mais simples no navegador local.

### 4.6 Experiência de uso fragmentada

Três editores com navegação, controles e modelos mentais distintos, acrescidos de um Guia separado. A revisão de UX deve avaliar consistência, densidade, hierarquia, nomes, feedback, fluxo de projeto e adaptação para telas pequenas. A análise não pode presumir que uma tela única ou redesign específico é desejado; primeiro mapear o que é incômodo e por quê.

## 5. O que não deve ser confundido

- HTML não é sinônimo de arquitetura ruim.
- WebView não é automaticamente inadequado para um editor 3D offline.
- Dividir um arquivo em dezenas de arquivos sem fronteiras claras pode piorar a manutenção.
- Migrar tudo para Kotlin/Compose pode transferir complexidade em vez de eliminá-la, e não resolve por si só o render 3D.
- Um monólito pode ser modularizado sem mudar de tecnologia ou reescrever a UI.
- Uma redução de linhas não é, isoladamente, simplificação; o critério é diminuir acoplamento, estado implícito e motivos de mudança.

## 6. Opções de arquitetura a comparar

| Opção | Descrição | Vantagens | Custos/riscos |
|---|---|---|---|
| A. Modularizar sem trocar stack | HTML por editor em arquivos próprios; CSS/JS separados; ES modules; contratos explícitos | menor risco; mantém WebView/offline; fácil comparar baseline | continua híbrido; exige definir módulos |
| B. Shell + módulos de domínio compartilhados | serviços próprios para arquivos, projetos, persistência, cena, UI compartilhável | reduz duplicação; teste isolado; domínio separado da apresentação | contratos e versionamento interno precisam ser definidos |
| C. Nativo Android maior | Activity/Compose assume mais navegação e interface; WebView/Three.js isolado em viewport | integração nativa melhor em certos fluxos | custo maior, risco de regressão, bridge mais complexa; render 3D continua web |
| D. Reescrita integral | substituição ampla da UI e organização atual | liberdade de desenho | maior custo, regressões, perda de comportamento e validação demorada |

**Hipótese inicial para investigação, não decisão:** começar avaliando A + B como uma sequência incremental. C pode ser usada pontualmente quando houver necessidade real. D só se os dados mostrarem que a estrutura atual não permite evolução sustentável.

## 7. Proposta de separação de responsabilidades

Estrutura conceitual — nomes e granularidade sujeitos à revisão:

```
android/
  app/src/main/
    java/com/nyra/studio/
      MainActivity.kt|java       # ciclo de vida e composição Android
      AndroidFileGateway         # SAF/URI e arquivos
      WebViewHost                # configuração WebView/AssetLoader
      ExportTransfer             # limite, chunks, cancelamento e limpeza
    assets/www/
      index.html                 # shell mínimo
      app/
        shell/
          bootstrap.js
          navigation.js
          preferences.js
          diagnostics.js
        guide/
          guide.html
          guide.css
          guide.js
        editors/
          items/
            index.html
            items.css
            items.js
            pixel-document.js
          character/
            index.html
            character.css
            character.js
            scene-document.js
          animation/
            index.html
            animation.css
            animation.js
            rig-document.js
        core/
          file-contract.js
          project-contract.js
          persistence.js
          event-bus.js
          validation.js
        model-io/
          import/
          export/
          blockbench/
        vendor/
          three/
          jszip/
```

Isso é uma proposta de organização, não um plano de criar cegamente cada arquivo. Módulos só devem ser extraídos quando houver responsabilidade e dependência bem delimitadas.

## 8. Regras arquiteturais candidatas

- Nenhum editor deve precisar conhecer o DOM interno dos outros editores.
- Shell conhece as entradas/saídas dos editores, não a implementação interna deles.
- Serviços de arquivos não devem depender da interface visual.
- Persistência deve ter contrato explícito, versão de esquema e estratégia de migração.
- Projetos devem distinguir metadados, estado do editor, assets binários e referências externas.
- Módulos de domínio devem ser testáveis sem WebView quando possível.
- UI depende de contratos de serviço, não de detalhes da Activity.
- Dependências locais devem ter versões e hashes reproduzíveis.
- Eventos entre shell/editor precisam de nomes, payloads e versões claros.
- Exceções, cancelamento e falha de IO devem retornar estado explícito, não apenas alert().
- Renderizador 3D deve ter lifecycle/dispose, resize, contexto perdido e gestão de memória documentados.

## 9. Plano incremental sugerido

### Etapa 0 — Congelar referência e medir

- Registrar commit base e SHA do APK de referência quando houver.
- Inventariar visualmente telas/fluxos e arquivos.
- Medir tamanho, dependências, tempos de inicialização e responsabilidades.
- Criar diagrama dos fluxos de dados e eventos.
- Não mudar comportamento.

### Etapa 1 — Separar conteúdo da geração

- Extrair os três HTML de Base64 para documentos reais em arquivos independentes.
- Manter IDs, funções e semântica intactos.
- Trocar `srcdoc` por URLs locais através de WebViewAssetLoader, ou outra rota compatível e comprovada.
- Remover a necessidade de localizar o início/fim de payloads em scripts de auditoria.
- Confirmar que assets locais e módulos ES funcionam sob o mesmo origin/segurança.

### Etapa 2 — Desmontar o adapter monolítico

- Extrair CSS, painel e lógica NyraModelIO/DSL em arquivos próprios.
- Definir ponto de extensão explícito do Criador (módulo bootstrap/API pública).
- Não inserir script em string nem substituir HTML via regex.
- Testar dependências importmap/ES modules e ordem de inicialização.

### Etapa 3 — Criar serviços compartilhados

- Contrato de abertura e salvamento de arquivo.
- Contrato de projeto e persistência.
- Diagnóstico/log estruturado.
- Preferências e navegação.
- Comunicação shell/editor versionada.
- Não criar um event bus genérico se uma interface direta e pequena resolver.

### Etapa 4 — Reavaliar UX e consistência visual

- Revisão comparativa das três áreas.
- Identificar controles duplicados/inconsistentes.
- Definir sistema visual pequeno: espaçamento, tipografia, estados, botões, campos, painéis.
- Adaptar para mobile primeiro sem ocultar ferramentas avançadas.
- Validar com o Guia separado da identidade/runtime 3D do editor.

### Etapa 5 — Avaliar migração nativa seletiva

- Só migrar interface Android se os problemas forem realmente de integração nativa.
- Manter render 3D no contexto que entregue melhor compatibilidade/desempenho.
- Testar comunicação e lifecycle antes de expandir camada nativa.

### Etapa 6 — Remoção final

- Apagar caminhos antigos somente após comparação funcional, testes automatizados e ensaio físico.
- Atualizar docs e auditorias para validar módulos em vez de strings codificadas.

## 10. Gates de qualidade

- Build e testes reproduzíveis a partir do commit.
- Mesmos projetos/fixtures abrem e salvam sem perda.
- Sem requisições de rede no runtime offline, salvo decisão explícita do usuário.
- Sem regressão na seleção de arquivos e exportação Android.
- Sem aumento injustificado do tempo de abertura, consumo de memória ou APK.
- Editor mantém estado e recursos conforme contrato documentado.
- WebView/Three.js tem lifecycle e tratamento de erro mensurável.
- Testes físicos em pelo menos um aparelho real, com registro de Android/WebView e APK SHA.
- Frente D segue intocada durante toda esta revisão.

## 11. Perguntas que a auditoria deve responder com evidência

1. Quais responsabilidades estão indevidamente centralizadas no shell?
2. Quais partes realmente precisam permanecer em Java/Kotlin?
3. O que os iframes isolam de útil e o que só complicam?
4. Como tornar módulos ES independentes sem perder o funcionamento offline?
5. Que código está sendo duplicado entre HTML original e adaptadores?
6. Que partes podem ser testadas sem WebView?
7. Qual é o modelo de projeto e persistência real, comparado à expectativa?
8. Quais atritos visuais/operacionais são compartilhados entre editores?
9. Quais recursos são utilizados, quais são protótipos e quais são apenas painéis demonstrativos?
10. Qual migração entrega o maior ganho por menor risco?

## 12. Status

- [x] Corrigido escopo da PR para revisão ampla de produto/arquitetura.
- [x] Inventário inicial de arquivos/tamanhos e concentração de responsabilidades.
- [x] Mapa arquitetural inicial.
- [ ] Revisão detalhada de UX em cada editor.
- [ ] Mapa completo de funções, dependências, contratos e eventos.
- [ ] Auditoria de duplicação entre templates originais e adaptadores.
- [ ] Comparação mensurável de opções de arquitetura.
- [ ] Proposta final priorizada e plano de migração com estimativas relativas.
- [ ] Protótipo modular mínimo, após validar os contratos.
