CREATE DATABASE	 nautilus;
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
    cnpj CHAR(14) NOT NULL UNIQUE,
    dt_registro DATE,
    dominio VARCHAR(60) NOT NULL UNIQUE,
    sla_minutos INT NOT NULL DEFAULT 20,
    CONSTRAINT ckEmpresaSla CHECK (sla_minutos > 0)
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
    chave_jira VARCHAR(50),
    dt_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    dt_fim DATETIME NULL,
    fk_componente_node INT NOT NULL,
    
    CONSTRAINT ckAlertaStatus
        CHECK (status IN ('aberto', 'em_andamento', 'resolvido', 'fechado')),
    CONSTRAINT cFkAlertaComponenteNode
        FOREIGN KEY (fk_componente_node)
        REFERENCES componente_node(id_componente_node)
);
