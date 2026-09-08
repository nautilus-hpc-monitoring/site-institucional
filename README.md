# Nautilus

> **Solução de monitoramento inteligente e garantia de integridade para supercomputadores**



## Sobre o projeto

O **Projeto Nautilus** é uma solução dedicada às diretrizes de HPC da Petrobras. Nosso objetivo é fornecer telemetria, dashboards inteligentes e alertas preditivos para supercomputadores de alto desempenho.

Ao monitorar as métricas físicas de hardware, o Nautilus garante a continuidade de processamentos críticos, mitigando interrupções que podem atrasar decisões de negócio.

## Problema e justificativa

HPCs operam processamentos paralelos de dados massivos (*very very big datasets*). Estes cálculos chegam a durar semanas seguidas e consomem cerca de **~2 MW de potência** (gerando um custo energético de **R$ 24.000 por dia**). 

Sem um monitoramento, o cluster fica exposto a:
1. **Perda de jobs por falhas ocultas:** Se um nó falhar por estouro de memória (OOM) ou superaquecimento após duas semanas de cálculo, o job é abortado e todo o custo de processamento e energia é desperdiçado.
2. **Degradação de desempenho (Clock throttling):** Quando as CPUs ou GPUs ultrapassam limites térmicos, elas reduzem o clock automaticamente para proteção física, degradando silenciosamente a performance computacional geral do cluster.
3. **Custo de ociosidade (Downtime):** Atrasos em imagens tridimensionais do subsolo mantêm navios de perfuração e sondas de exploração ociosos na superfície marinha, custando centenas de milhares de dólares por dia.

## Principais funcionalidades do Nautilus

*   **Prevenção de XXXX** Descrição

## Arquitetura

O Nautilus monitora o ecossistema de HPCs de forma estruturada em quatro camadas integradas:

              ┌─────────────────────────────────────────┐
              │    Armazenamento                        │
              └─────────────────────────────────────────┘
                                   ▲
                                   │ 
                                   ▼
              ┌─────────────────────────────────────────┐
              │    Software & Middleware                │
              └─────────────────────────────────────────┘
                                   ▲
                                   │ 
                                   ▼
              ┌─────────────────────────────────────────┐
              │   Rede                                  │
              └─────────────────────────────────────────┘
                                   ▲
                                   │
                                   ▼
              ┌─────────────────────────────────────────┐
              │      Hardware                           │
              └─────────────────────────────────────────┘

> 📌 *Os diagramas técnicos detalhados e completos de arquitetura desenvolvidos para esta solução estão disponíveis na pasta xxxxx do projeto:*
> *   **Arquitetura do fluxo de trabalho:** `fluxo.png`
> *   **Arquitetura de infraestrutura:** `arquitetura.png`

## Stack

*   **Coletores:** Python

## Instruções de instalação e execução

Para rodar os agentes de coleta e o painel de monitoramento localmente em ambiente de testes:

### 1. Clonar o repositório