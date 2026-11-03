# Credenciais AWS na EC2

Associe a instancia ao perfil IAM permitido pelo laboratorio (confirme LabInstanceProfile / LabRole). O servidor usa explicitamente o provedor EC2 do SDK e nao usa chaves do .env. O painel S3 tambem usa esse provedor.

1. Instale as dependencias com `npm install`.
2. No banco existente, execute somente `src/database/migrations/001-aws-credentials.sql`. Nao recrie as tabelas da aplicacao. Conceda ao usuario da aplicacao SELECT, INSERT e UPDATE nessa tabela.
3. Configure `AMBIENTE_PROCESSO=producao` no ambiente de inicializacao e `AWS_CREDENTIAL_SYNC_ENABLED=true`, `AWS_REGION=us-east-1` (ou sua regiao), alem das configuracoes DB_* e APP_* existentes. Remova as chaves AWS antigas do ambiente.
4. Inicie com `npm start`. A sincronizacao comeca imediatamente, verifica o provedor a cada minuto e tenta novamente em 30 segundos quando falha. Credenciais com menos de cinco minutos restantes nao sao distribuidas. O site permanece acessivel durante falhas; a rota de credenciais retorna 503 quando nao consegue obter credenciais validas.

## Endpoint dos agentes

`POST /auth/credenciais`, via HTTPS, com JSON contendo `email`, `senha` e `hostname`, como no login atual. A rota reutiliza a validacao de senha e de pertencimento da maquina a empresa do usuario. Ela nao depende da consulta de componentes/parametros. O contrato de `POST /auth` permanece igual.

Resposta 200: `{ "credenciais": { "accessKeyId": "...", "secretAccessKey": "...", "sessionToken": "...", "expiration": "data ISO UTC" }, "region": "us-east-1" }`.

O agente deve criar/atualizar o cliente S3 com esses valores, renovar antes de expiration e repetir o lote pendente em caso de expiracao. Credenciais nao sao incluidas em logs; configure tambem o proxy para nao registrar corpos desta rota. A resposta usa Cache-Control: no-store.

As credenciais sao armazenadas em texto no banco e concedem as mesmas permissoes da funcao EC2 a todos os agentes autorizados. Restrinja o acesso ao banco e use transporte TLS quando ele for remoto; nao exponha a tabela ou backups. A autenticacao existente por senha e hostname foi preservada, nao foi criada uma sessao nova de agentes. Aplique limites de requisicoes no proxy de entrada.

## Docker e laboratorio

O container precisa conseguir acessar o IMDS da EC2. Use IMDSv2; em redes bridge, pode ser necessario ajustar o hop limit de resposta para 2. O acesso ao banco deve estar pronto e a migracao aplicada. A configuracao Docker existente nao foi alterada ou validada.

As Lambdas usam suas proprias funcoes IAM. Nenhum codigo Lambda foi alterado. Esta configuracao nao inicia ou prolonga a sessao do Learner Lab.

## Verificacao

`node --test test/awsCredentialsSync.test.js` verifica concorrencia, validade, falha de banco e retentativa. Validacao real depende de executar na EC2 com MySQL e IAM configurados. Primeiro teste login invalido (sem credenciais), hostname de outra empresa (sem credenciais), login valido (200), e falha/expiracao (503 sem credenciais vencidas). Nao imprima as chaves em terminais ou screenshots.
