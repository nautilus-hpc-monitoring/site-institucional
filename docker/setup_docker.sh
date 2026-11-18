#!/bin/bash

# Dê um chmod +x setup_docker.sh antes.
# Pode ser executado de qualquer diretório: o compose é localizado pelo caminho do script.

set -u

DIR_DOCKER="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$DIR_DOCKER/docker-compose.yml"

if [ ! -f "$DIR_DOCKER/Dockerfile" ] || [ ! -f "$COMPOSE_FILE" ]; then
    echo "Arquivos Dockerfile ou docker-compose.yml não encontrados!"
    exit 1
fi

if [ ! -f "$DIR_DOCKER/../.env" ]; then
    echo "Arquivo .env não encontrado na raiz do projeto!"
    exit 1
fi

echo "Criando containers..."
docker compose -f "$COMPOSE_FILE" up -d --build
docker ps -a

echo "Aplicação disponível em http://localhost:8080"

# Para que funcione é necessário criar o .env na pasta raiz do projeto. Abaixo há um modelo de .env comentado:
# O compose sobrescreve DB_HOST/DB_PORT/DB_USER/DB_PASSWORD e APP_PORT para o ambiente local.

#AMBIENTE_PROCESSO=producao

# Configurações de conexão com o banco de dados
#DB_HOST='seusDadosAqui'
#DB_DATABASE='seusDadosAqui'
#DB_USER='seusDadosAqui'
#DB_PASSWORD='seusDadosAqui'
#DB_PORT='seusDadosAqui'

# Configurações do servidor de aplicação
#APP_PORT=8080
#APP_HOST=localhost

# importante: caso sua senha contenha caracteres especiais, insira-a entre 'aspas'

#RESEND_API_KEY='SeusdadosAqui'
