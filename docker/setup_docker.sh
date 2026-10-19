#!/bin/bash

# Dê um chmod +x setup_docker.sh antes

# Validando quantidade de arquivos dentro do diretório
if [ $(ls -1 | wc -l) -eq 3 ]; then
    
    # Mudando de diretório
    cd ..
    
    # Procurando o .env
    if find . -maxdepth 1 -name ".env" | grep -q ".env"; then 
        echo "Criando container..."
        sudo docker compose up --build
        sudo docker ps -a
    else
        echo "Arquivo .env não encontrado!"
    fi

else
    echo "Arquivos Dockerfile ou docker-compose.yml não encontrados!"
fi
