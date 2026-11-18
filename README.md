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

### Opção 1: Via Docker (Recomendado)



Você pode subir toda a aplicação utilizando o script de automação incluído na pasta `docker/`:



```bash

# Acesse o diretório docker

cd docker



# Dê permissão de execução ao script (caso necessário)

chmod +x setup_docker.sh



# Execute o setup

./setup_docker.sh

```

> O `.env` é obrigatório na raiz do projeto. O compose sobrescreve `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `APP_PORT` para usar o MySQL local (`root`/`urubu100`).



Ou manualmente via **Docker Compose**:



```bash

docker compose -f docker/docker-compose.yml up -d --build

```



Após subir os containers, acesse: `http://localhost:8080`.



### Opção 2: Execução Local (Node.js)



Certifique-se de ter o **Node.js** instalado em sua máquina:



```bash

# Instale as dependências

npm install



# Inicie o servidor

node app.js

```



Após iniciar, acesse no navegador: `http://localhost:8080` (ou a porta definida em `APP_PORT` no `.env`).



---



## Variáveis de Ambiente



Crie um arquivo `.env` na raiz do projeto (ou `.env.dev` para desenvolvimento) seguindo o modelo:

```env
AMBIENTE_PROCESSO=producao

DB_HOST=localhost
DB_DATABASE=nautilus
DB_USER=root
DB_PASSWORD='suaSenha'
DB_PORT=3306

APP_PORT=8080
APP_HOST=localhost

RESEND_API_KEY='suaChave'
```

> `AMBIENTE_PROCESSO` é lido antes do dotenv: para usar `.env.dev`, defina `AMBIENTE_PROCESSO=desenvolvimento` no shell antes de iniciar o Node.

