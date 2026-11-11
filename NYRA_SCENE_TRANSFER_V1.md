# Nyra — Contrato de transferência de projeto 3D e animação (D2)

**Versão:** 1  
**Estado:** especificação técnica inicial para integração Character Editor ↔ RoboTV.  
**Objetivo:** transferir estrutura e animações entre iframes sem compartilhar objetos Three.js, WebGL, referências DOM ou estado mutável de um editor para outro.

## 1. Princípio

Cada editor continua responsável por sua própria cena/renderização. O intercâmbio acontece por um documento JSON serializável, versionado e validado. A origem do documento deve permanecer preservada, inclusive quando a Nyra ainda não reproduz ou edita um recurso.

O contrato não transforma automaticamente qualquer formato em Minecraft Bedrock. O campo `target` distingue intenção de exportação, e a validação do formato final continua sendo feita pelo exportador Bedrock específico.

## 2. Envelope

```json
{
  "schema": "nyra.scene-transfer",
  "schemaVersion": 1,
  "project": {
    "id": "stable-project-id",
    "name": "Nome do projeto",
    "source": {
      "format": "blockbench",
      "formatVersion": "5.0",
      "modelFormat": "bedrock",
      "fileName": "modelo.bbmodel"
    },
    "target": {
      "format": "bedrock_entity",
      "version": null
    }
  },
  "scene": {
    "coordinateSystem": "nyra-local",
    "nodes": [],
    "materials": [],
    "textures": []
  },
  "animations": {
    "clips": []
  },
  "extensions": {},
  "diagnostics": []
}
```

## 3. Nós

Cada nó contém:
- `id`: ID interno estável da Nyra;
- `sourceId`: UUID de origem, quando existir;
- `name`: nome visível;
- `type`: `group`, `bone`, `cube`, `mesh`, `locator` ou `empty`;
- `parentId`: ID do pai ou null;
- `children`: IDs dos filhos (opcional; validar consistência com parentId);
- `transform`: transformação local;
- `pivot`: pivô local, separado da origem geométrica;
- `geometry`: referência à geometria/material, quando aplicável;
- `visibility`: estado visual, sem excluir o nó do documento;
- `sourceData`: dados originais não representados genericamente.

Transformação:
```json
{
  "position": [0, 0, 0],
  "rotation": [0, 0, 0],
  "rotationUnit": "radians",
  "rotationOrder": "XYZ",
  "scale": [1, 1, 1]
}
```

Não achatar hierarquia. Nós vazios e bones sem geometria devem continuar existindo se forem pivôs ou alvos de animação.

## 4. Geometria, material e textura

A geometria deve ser referenciada separadamente dos nós para permitir que vários nós façam referência a um asset sem duplicar imagem/base de dados.

- Cubo: origem, dimensão, inflate, mirror e UV por face.
- Malha: vértices, índices/faces, normais e UV por canto da face.
- Materiais: cor, transparência, face side e propriedades ainda suportadas.
- Texturas: ID, nome, MIME type, largura/altura e conteúdo incorporado (data URL/Base64) ou referência a asset incluído no pacote.

Se o payload exceder limites internos de mensagem, a transferência futura poderá usar chunks versionados; não truncar silenciosamente nem remover texturas para caber.

## 5. Clips e canais

Cada clip preserva:
- `id`, `name`, `duration`, `loop`, `sourceData`;
- canais por `targetNodeId`;
- propriedade: `position`, `rotation`, `scale` ou propriedade de extensão;
- keyframes ordenados por tempo;
- valor vetorial ou escalar;
- interpolação original;
- metadados/expressões (incluindo Molang) em `sourceData`.

Exemplo:
```json
{
  "id": "clip-walk",
  "name": "walk",
  "duration": 1,
  "loop": true,
  "channels": [
    {
      "targetNodeId": "bone-leg-left",
      "property": "rotation",
      "keyframes": [
        {"time": 0, "value": [0, 0, 0], "interpolation": "linear"},
        {"time": 0.5, "value": [0, 0.6, 0], "interpolation": "linear"}
      ],
      "sourceData": {}
    }
  ],
  "sourceData": {}
}
```

A reprodução inicial no RoboTV pode suportar apenas parte dos canais/interpolações. O contrato deve preservar os demais sem inventar uma conversão de execução. Molang é dado de origem/expressão; nunca executar como JavaScript.

## 6. Validação

Rejeitar o envelope antes de substituir o projeto atual se:
- schema/schemaVersion não forem suportados;
- IDs forem duplicados;
- parentId apontar para nó inexistente;
- houver ciclo na hierarquia;
- transform/pivot tiverem vetores inválidos;
- clip/canal apontar para nó inexistente;
- tempos forem não finitos ou negativos;
- keyframes não puderem ser ordenados/interpretados com segurança;
- referências a assets forem inválidas.

Advertir, sem descartar:
- canais desconhecidos;
- interpolações desconhecidas;
- extensões de origem;
- malhas sem destino Bedrock compatível;
- assets externos não incorporados.

A aplicação é transacional: validar e preparar o projeto candidato primeiro; somente depois de sucesso ele substitui o projeto ativo.

## 7. Transferência entre editores

- O editor produtor serializa o documento completo.
- O host recebe a mensagem, confere origem, versão e tamanho.
- O host encaminha apenas dados serializáveis ao iframe de destino.
- O RoboTV reconstrói sua própria hierarquia/rig e cria uma visualização local.
- O editor de origem permanece intacto até o destino confirmar importação bem-sucedida.
- A resposta contém sucesso, ID do projeto e diagnósticos de preservação/perda.

A primeira implementação deve usar mensagens versionadas no host. Não expor objetos Three.js diretamente ao outro iframe. Para persistência entre sessões, gravar o envelope no armazenamento de projeto/autosave compartilhado, sem apagar as chaves de rascunho legadas.

## 8. Primeira fatia implementável

1. Adicionar `NyraSceneTransferV1` como módulo puro de validação/normalização.
2. Criar testes unitários de hierarquia, pivôs, IDs, clips e referências inválidas.
3. No Character Editor, converter o resultado de `parseBBModel` para este envelope, mantendo `rawData`.
4. No host, encaminhar envelope para o iframe RoboTV com handshake e confirmação.
5. No RoboTV, primeiro exibir lista/diagnóstico de clips e hierarquia. Depois acrescentar reprodução de rotação por nó.
6. Só depois ligar as interações da timeline e os botões de importação/exportação.


## 9. Exportação e reabertura — escopo corrigido

A exportação da Nyra deve produzir **um formato de modelo que o Minecraft Bedrock aceite e que a própria Nyra consiga importar novamente**. Não é requisito gerar automaticamente um Resource Pack completo, client entity, Behavior Pack, controllers ou lógica de comportamento nesta etapa.

Formato prioritário para a primeira entrega:
- **Bedrock geometry JSON** (`.geo.json`) como formato de modelo aceito pelo pipeline de entidades do Minecraft Bedrock.
- Textura(s) referenciadas, preservando dimensões e UV.
- Se necessário, pacote ZIP/manifesto leve apenas para transportar os arquivos do modelo e texturas, sem prometer configuração completa de entidade.

A Nyra deve ter um importador próprio para esse mesmo formato, com operação de abrir/reabrir. O importador precisa reconstruir a mesma árvore, bones, pivôs, cubos, transforms e UVs; não deve depender de um arquivo `.bbmodel` original para reabrir uma exportação gerada pela Nyra.

### Fluxo de ida e volta obrigatório
1. Importar um projeto (por exemplo, `.bbmodel`) para o documento canônico Nyra.
2. Exportar para Bedrock Geometry JSON + assets de textura necessários.
3. Abrir esse `.geo.json` (e seus assets associados) novamente na Nyra.
4. Comparar estrutura, nomes, relações pai/filho, pivôs, transforms, cubos, UVs e dimensões de textura.
5. Preservar informações que não pertencem ao formato de geometria em um projeto Nyra opcional; não fingir que animações, Molang ou controllers foram armazenados dentro do `.geo.json`.

### Fora do escopo desta entrega de modelo
- Resource Pack pronto para instalar com client entity.
- Behavior Pack.
- Controllers/estados de animação.
- Exportação de animações Bedrock.
Esses recursos podem ser etapas futuras, mas não devem bloquear a exportação/reabertura do formato de modelo solicitada.

### Compatibilidade de formatos
- `.bbmodel`: formato de projeto editável do Blockbench, suportado pela Nyra como origem quando o template é conhecido.
- `.geo.json`: formato de geometria Bedrock que a Nyra deve exportar e reabrir.
- `.glb`: formato 3D genérico para intercâmbio/preview; não substitui o formato Bedrock.
- `nyra.scene-transfer`: formato interno de comunicação entre editores; não é formato de runtime Minecraft.

## 10. Compatibilidade

- `nyra.scene-transfer` não é .bbmodel, geometry JSON Bedrock, animation JSON Bedrock nem Resource Pack.
- Exportadores específicos traduzem o documento para cada alvo e devem gerar relatório de compatibilidade.
- Alterações futuras incrementam `schemaVersion` quando quebram compatibilidade; propriedades adicionais podem ser preservadas em `extensions` e `sourceData`.

## 11. Requisitos derivados do corpus Bedrock

A análise estrutural dos 278 arquivos `.geo.json` dos add-ons Dragon Evolution v1.5.0 e Novatsug's Extra Clothes v1.11 está registrada em `docs/NYRA_FRENTE_D_BEDROCK_CORPUS_ESTUDO.md`.

O corpus confirmou que a transferência precisa preservar, no mínimo:
- bones hierárquicos e bones sem cubos;
- pivôs e rotações de bones;
- cubos com origem, dimensões, pivô, rotação, inflate e mirror;
- UV de caixa e UV por face, incluindo faces omitidas e inversão especial de `up`/`down`;
- `uv_rotation`, `material_instance`, locators e metadados de bone;
- dimensões da textura sem fingir que o bitmap PNG está incorporado ao `.geo.json`.

Animações e controladores permanecem documentos separados do Geometry JSON. Recursos desconhecidos devem ser preservados em `sourceData`/`extensions` e sinalizados; não devem ser descartados silenciosamente.

As regras de coordenadas e de versão mínima foram comparadas com o codec público do Blockbench e a documentação Microsoft. O teste `android/scripts/audit_bedrock_geometry_v1.cjs` cobre a conversão assimétrica e o ciclo exportar → importar → exportar. A auditoria estrutural do corpus não substitui a validação visual no Blockbench nem o carregamento real no Minecraft Bedrock.

## 12. Regra de identidade do Guia e do editor

O Robô TV que aparece como personagem-guia pertence ao **Guia Interativo**. Ele não é o rig-base obrigatório do editor RoboTV/Animação. O editor de animação deve receber o projeto 3D/rig que o usuário importar ou transferir, reconstruir sua própria hierarquia e operar sobre esses nós e clips. O Guia mantém seu personagem de apresentação independente.

A transferência Character Editor → host → RoboTV não deve modificar o estado do Guia, trocar seu mascote ou usar a presença dele como substituto para a confirmação de um projeto importado no editor.

## 13. Endurecimento do validador v1

A implementação atual de `NyraSceneTransferV1.normalizeSceneTransfer` acrescenta:
- validação de segurança JSON sobre o envelope inteiro antes da normalização;
- rejeição de ciclos, getters/setters, funções, símbolos e números não finitos em dados de transferência;
- validação de metadados básicos do projeto;
- consistência bidirecional de `parentId` e `children`, sem IDs filhos repetidos;
- IDs únicos de clips, duração numérica finita, loop booleano e referências de nós válidas;
- keyframes com tempo numérico finito, ordenação e rejeição de tempos duplicados;
- vetores 3D estritos para canais nativos de posição/rotação/escala;
- preservação de valores JSON arbitrários para canais de extensão desconhecidos, com aviso em vez de conversão destrutiva;
- avisos para canais/interpolações ainda não reproduzidos e keyframes além da duração.

Os testes automatizados ampliados devem passar no commit exato em que a validação é executada. Eles não substituem testes físicos, round-trip em Blockbench ou carregamento no Minecraft Bedrock.
