# Nyra 3D Studio — Frente D: Animação e integração Blockbench

## Prioridade
A Frente D deve ser executada **antes da Frente B**. Esta ordem é deliberada e deve ser respeitada no planejamento das próximas etapas.

## Objetivo
Consolidar o fluxo de importação, edição, animação e exportação de modelos na área RoboTV/Animação, mantendo a estrutura e as animações compatíveis trazidas de arquivos Blockbench.

## Requisitos registrados

1. **Controles na área de Animação**
   - Disponibilizar os comandos de importar e exportar dentro da própria área/painel de Animação.
   - Não considerar suficiente deixar os controles de exportação apenas no rodapé do editor geral.
   - Manter a organização de controles coerente com o fluxo de trabalho da animação.

2. **Importação Blockbench com preservação de animações**
   - Ao importar um modelo `.bbmodel` compatível com Minecraft/Blockbench, preservar as animações existentes, como já ocorre no fluxo de criação de personagens.
   - Preservar, quando presentes e suportados, grupos, hierarquia/outliner, pivôs, ossos/juntas, transformações, canais e clips de animação.
   - Não reduzir o modelo importado a geometria estática quando houver dados de animação que possam ser mantidos.

3. **Integração com a timeline RoboTV/Animação**
   - Tornar os clips importados acessíveis e utilizáveis na área de Animação.
   - Permitir continuar editando/criando animações sem perder a estrutura original do modelo.
   - Investigar e completar a integração entre o adaptador de importação Blockbench e a timeline RoboTV.

4. **Formas de animação a manter no planejamento**
   - Animação por objeto/grupo: movimentar objetos ou grupos na hierarquia.
   - Animação por esqueleto: utilizar ossos/juntas compatíveis já existentes.
   - Animação por keyframes: definir posição, rotação e escala ao longo do tempo.
   - Preservar pivôs e relações hierárquicas durante a edição e reprodução.

5. **Compatibilidade e preparação**
   - Quando um modelo não tiver estrutura adequada para determinado tipo de animação, identificar a limitação e indicar o que precisa ser preparado/rigado.
   - Não prometer animação esquelética em modelos sem ossos/juntas compatíveis.
   - Informar limitações de canais, interpolações, eventos ou semânticas específicas do formato, em vez de descartar dados silenciosamente.

## Validação obrigatória
- Importar um `.bbmodel` com animações e verificar se todos os clips esperados aparecem na área RoboTV/Animação.
- Usar `kintsugi.bbmodel` (referência conhecida com 28 animações) como caso real de validação.
- Confirmar hierarquia, grupos, pivôs, ossos/juntas, canais e reprodução.
- Editar uma animação importada e criar uma nova animação por objeto/grupo, por esqueleto quando suportado e por keyframes.
- Exportar e reimportar para verificar a preservação possível dos dados.
- Testar também modelos sem animação e modelos sem esqueleto, deixando claras as capacidades disponíveis em cada caso.
- Fazer validação visual e funcional no Android/WebView; testes estáticos ou CI verde não substituem o ensaio real.

## Estado conhecido no momento do registro
O README e o registro técnico existentes indicam que:
- O importador Blockbench já reconhece canais compatíveis de animação em parte do fluxo.
- O Kintsugi foi analisado estruturalmente e contém 28 animações.
- A integração completa dos clips importados na timeline RoboTV ainda não está validada.
- A cobertura atual não garante todas as semânticas, interpolações ou eventos possíveis de Blockbench/Bedrock.
- A inspeção e validação dos modelos reais no Android continuam pendentes.

Portanto, esta frente é registrada como **trabalho pendente de integração e validação**, não como funcionalidade concluída.

## Relação com outras frentes
- **Frente D:** executar primeiro, antes da Frente B.
- A Frente D não substitui nem apaga os requisitos já registrados nas demais frentes.
- A ordem posterior das outras frentes permanece como estava; este registro apenas estabelece a precedência explícita de D sobre B.
