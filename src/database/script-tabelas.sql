CREATE DATABASE IF NOT EXISTS nautilus;
USE nautilus;

CREATE TABLE aws_credentials (
    id TINYINT PRIMARY KEY,
    access_key_id VARCHAR(128) NOT NULL,
    secret_access_key TEXT NOT NULL,
    session_token TEXT NOT NULL,
    expiration_ms BIGINT NOT NULL
);

CREATE TABLE empresa (
    id_empresa INT PRIMARY KEY AUTO_INCREMENT,
    razao_social VARCHAR(60) NOT NULL,
    sla_minutos INT NOT NULL DEFAULT 20,
    cnpj CHAR(14) NOT NULL UNIQUE,
    dt_registro DATE,
    dominio VARCHAR(60) NOT NULL UNIQUE 
);

CREATE TABLE endereco (
    id_endereco INT PRIMARY KEY AUTO_INCREMENT,
    logradouro VARCHAR(100) NOT NULL,
    numero VARCHAR(10) NOT NULL,
    cidade VARCHAR(45) NOT NULL,
    estado CHAR(2) NOT NULL,
    fk_empresa INT NOT NULL,
    CONSTRAINT cFkEnderecoEmpresa
        FOREIGN KEY (fk_empresa)
        REFERENCES empresa(id_empresa)
);

CREATE TABLE nivel_acesso (
    id_nivel_acesso INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(45) NOT NULL
);

CREATE TABLE permissao (
    id_permissao INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(45) NOT NULL,
    descricao VARCHAR(100)
);

CREATE TABLE permissao_nivel_acesso (
    fk_permissao INT NOT NULL,
    fk_nivel_acesso INT NOT NULL,
    PRIMARY KEY (fk_permissao, fk_nivel_acesso),
    CONSTRAINT cFkPnaPermissao
        FOREIGN KEY (fk_permissao)
        REFERENCES permissao(id_permissao),
    CONSTRAINT cFkPnaNivelAcesso
        FOREIGN KEY (fk_nivel_acesso)
        REFERENCES nivel_acesso(id_nivel_acesso)
);

CREATE TABLE usuario (
    id_usuario INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    email_institucional VARCHAR(60) NOT NULL UNIQUE,
    cpf CHAR(11) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    verificado TINYINT DEFAULT 0,
    fk_nivel_acesso INT,
    fk_empresa INT,
    CONSTRAINT cFkUsuarioNivelAcesso
        FOREIGN KEY (fk_nivel_acesso)
        REFERENCES nivel_acesso(id_nivel_acesso),
    CONSTRAINT cFkUsuarioEmpresa
        FOREIGN KEY (fk_empresa)
        REFERENCES empresa(id_empresa)
);

CREATE TABLE verificacao_email (
    id_verificacao INT PRIMARY KEY AUTO_INCREMENT,
    token VARCHAR(255) NOT NULL UNIQUE,
    dt_expiracao DATETIME NOT NULL,
    fk_usuario INT NOT NULL,
    CONSTRAINT cFkVerificacaoUsuario
        FOREIGN KEY (fk_usuario)
        REFERENCES usuario(id_usuario)
);

CREATE TABLE ambiente_hpc (
    id_ambiente_hpc INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(45) NOT NULL,
    status VARCHAR(20) NOT NULL,
    endereco_localizacao VARCHAR(255) NOT NULL,
    fk_empresa INT NOT NULL,
    CONSTRAINT ckAmbienteHpcStatus
        CHECK (status IN ('ativo', 'inativo', 'manut.')),
    CONSTRAINT cFkAmbienteEmpresa
        FOREIGN KEY (fk_empresa)
        REFERENCES empresa(id_empresa)
);

CREATE TABLE cluster (
    id_cluster INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(45) NOT NULL,
    status VARCHAR(20) NOT NULL,
    fk_ambiente_hpc INT NOT NULL,
    CONSTRAINT ckClusterStatus
        CHECK (status IN ('ativo', 'inativo', 'manut.')),
    CONSTRAINT cFkClusterAmbiente
        FOREIGN KEY (fk_ambiente_hpc)
        REFERENCES ambiente_hpc(id_ambiente_hpc)
);

CREATE TABLE node (
    id_node INT PRIMARY KEY AUTO_INCREMENT,
    hostname VARCHAR(255) NOT NULL UNIQUE,
    ip VARCHAR(45) NOT NULL,
    sistema_operacional VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    fk_cluster INT NOT NULL,
    CONSTRAINT ckNodeStatus
        CHECK (status IN ('ativo', 'inativo', 'manut.')),
    CONSTRAINT cFkNodeCluster
        FOREIGN KEY (fk_cluster)
        REFERENCES cluster(id_cluster)
);

CREATE TABLE componente (
    id_componente INT PRIMARY KEY AUTO_INCREMENT,
    tipo VARCHAR(50) NOT NULL, 
    fabricante VARCHAR(100) NOT NULL, 
    modelo VARCHAR(100) NOT NULL,
    unidade_medida VARCHAR(20) NOT NULL
);

CREATE TABLE componente_node (
    id_componente_node INT PRIMARY KEY AUTO_INCREMENT,
    pico_max DECIMAL(10,2),
    pico_min DECIMAL(10,2),
    percentual DECIMAL(5,2),
    limite_atencao DECIMAL(10,2),
    limite_critico DECIMAL(10,2),
    
    fk_componente INT NOT NULL,
    fk_node INT NOT NULL,
    
    CONSTRAINT unqComponenteNodeParametro 
        UNIQUE (fk_componente, fk_node),
    CONSTRAINT cFkCnComponente
        FOREIGN KEY (fk_componente)
        REFERENCES componente(id_componente),
    CONSTRAINT cFkCnNode
        FOREIGN KEY (fk_node)
        REFERENCES node(id_node)
);

CREATE TABLE alerta (
    id_alerta INT PRIMARY KEY AUTO_INCREMENT,
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT,
    nivel VARCHAR(20) NOT NULL,
    valor_capturado DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'aberto',
    situacao_atendimento VARCHAR(20) NOT NULL DEFAULT 'nao_visto',
    chave_jira VARCHAR(50),
    dt_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    dt_fim DATETIME NULL,
    fk_componente_node INT NOT NULL,
    
    CONSTRAINT ckAlertaStatus
        CHECK (status IN ('aberto', 'em_andamento', 'resolvido', 'fechado')),
    CONSTRAINT ckAlertaAtendimento
        CHECK (situacao_atendimento IN ('nao_visto', 'ciente', 'em_analise')),
    CONSTRAINT cFkAlertaComponenteNode
        FOREIGN KEY (fk_componente_node)
        REFERENCES componente_node(id_componente_node)
);


INSERT INTO empresa (razao_social, cnpj, dt_registro, dominio) VALUES
('TechCorp Solucoes em TI', '12345678000195', '2024-01-15', 'techcorp.com.br'),
('DataData HPC Solutions', '98765432000110', '2024-03-20', 'datadata.io'),
('SPTECH', '18765432000110', '2022-08-20', 'sptech.school');

INSERT INTO endereco (logradouro, numero, cidade, estado, fk_empresa) VALUES
('Av. Paulista', '1000', 'Sao Paulo', 'SP', 1),
('Rua da Assembleia', '50', 'Rio de Janeiro', 'RJ', 2);

INSERT INTO nivel_acesso (nome) VALUES
('Administrador'),
('Analista de Infraestrutura'),
('Operador');

INSERT INTO permissao (nome, descricao) VALUES
('LEITURA_METRICAS', 'Permite visualizar dashboards e graficos de desempenho'),
('CONFIGURAR_ALERTAS', 'Permite alterar limites de parametros e notificacoes'),
('GESTAO_DISPOSITIVOS', 'Permite cadastrar e remover nodes, clusters e componentes');

INSERT INTO permissao_nivel_acesso (fk_permissao, fk_nivel_acesso) VALUES
(1, 1), (2, 1), (3, 1),
(1, 2), (2, 2),
(1, 3);

INSERT INTO ambiente_hpc (nome, status, endereco_localizacao, fk_empresa) VALUES
('Ambiente IA & Analytics', 'ativo', 'Rua das Laranjas, 123', 1),
('Ambiente Processamento Pesado', 'manut.', 'Rua das Abóboras, 166', 1);

INSERT INTO cluster (nome, status, fk_ambiente_hpc) VALUES
('Cluster-Alpha-GPU', 'ativo', 1),
('Cluster-Beta-CPU', 'ativo', 2),
('Cluster-Gamma-Render', 'manut.', 2);

INSERT INTO node (hostname, ip, sistema_operacional, status, fk_cluster) VALUES
('alpha-node01', '10.0.1.10', 'Ubuntu Server 22.04 LTS', 'ativo', 1),
('alpha-node02', '10.0.1.11', 'Ubuntu Server 22.04 LTS', 'ativo', 1),
('alpha-node03', '10.0.1.12', 'Ubuntu Server 22.04 LTS', 'ativo', 1),
('alpha-node04', '10.0.1.13', 'Ubuntu Server 22.04 LTS', 'ativo', 1),
('alpha-node05', '10.0.1.14', 'Ubuntu Server 22.04 LTS', 'ativo', 1),

('beta-node01', '10.0.2.10', 'Red Hat Enterprise Linux 9', 'ativo', 2),
('beta-node02', '10.0.2.11', 'Red Hat Enterprise Linux 9', 'ativo', 2),
('beta-node03', '10.0.2.12', 'Red Hat Enterprise Linux 9', 'ativo', 2),
('beta-node04', '10.0.2.13', 'Red Hat Enterprise Linux 9', 'ativo', 2),
('beta-node05', '10.0.2.14', 'Red Hat Enterprise Linux 9', 'ativo', 2),

('gamma-node01', '10.0.3.10', 'Ubuntu Server 22.04 LTS', 'ativo', 3),
('gamma-node02', '10.0.3.11', 'Ubuntu Server 22.04 LTS', 'ativo', 3),
('gamma-node03', '10.0.3.12', 'Ubuntu Server 22.04 LTS', 'ativo', 3),
('gamma-node04', '10.0.3.13', 'Ubuntu Server 22.04 LTS', 'ativo', 3),
('gamma-node05', '10.0.3.14', 'Ubuntu Server 22.04 LTS', 'ativo', 3);e

	

