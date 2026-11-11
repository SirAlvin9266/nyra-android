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

## 9. Compatibilidade

- `nyra.scene-transfer` não é .bbmodel, geometry JSON Bedrock, animation JSON Bedrock nem Resource Pack.
- Exportadores específicos traduzem o documento para cada alvo e devem gerar relatório de compatibilidade.
- Alterações futuras incrementam `schemaVersion` quando quebram compatibilidade; propriedades adicionais podem ser preservadas em `extensions` e `sourceData`.
