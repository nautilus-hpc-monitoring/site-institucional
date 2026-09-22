DROP USER IF EXISTS 'user_admin'@'localhost';
CREATE USER 'user_admin'@'localhost' IDENTIFIED BY 'SPTech#2026';
GRANT ALL PRIVILEGES ON nautilus.* TO 'user_admin'@'localhost';
FLUSH PRIVILEGES;

DROP DATABASE IF EXISTS nautilus;
CREATE DATABASE nautilus;
USE nautilus;

CREATE TABLE empresa (
    id_empresa INT PRIMARY KEY AUTO_INCREMENT,
    razao_social VARCHAR(60) NOT NULL,
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

CREATE TABLE localizacao (
    id_localizacao INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    pais VARCHAR(100) NOT NULL,
    estado VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    cod_regiao VARCHAR(20) NOT NULL
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
    fk_empresa INT NOT NULL,
    fk_localizacao INT NOT NULL,
    CONSTRAINT ckAmbienteHpcStatus
        CHECK (status IN ('ativo', 'inativo', 'manut.')),
    CONSTRAINT cFkAmbienteEmpresa
        FOREIGN KEY (fk_empresa)
        REFERENCES empresa(id_empresa),
    CONSTRAINT cFkAmbienteLocalizacao
        FOREIGN KEY (fk_localizacao)
        REFERENCES localizacao(id_localizacao)
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
    num_serie VARCHAR(50),
    fk_componente INT NOT NULL,
    fk_node INT NOT NULL,
    CONSTRAINT unqComponenteNode UNIQUE (fk_componente, fk_node, num_serie),
    CONSTRAINT cFkCnComponente
        FOREIGN KEY (fk_componente)
        REFERENCES componente(id_componente),
    CONSTRAINT cFkCnNode
        FOREIGN KEY (fk_node)
        REFERENCES node(id_node)
);

CREATE TABLE parametro (
    id_parametro INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    pico_max DECIMAL(10,2),
    pico_min DECIMAL(10,2),
    percentual DECIMAL(5,2),
    limite_atencao DECIMAL(10,2),
    limite_critico DECIMAL(10,2),
    fk_componente_node INT NOT NULL,
    CONSTRAINT cFkParametroCompNode
        FOREIGN KEY (fk_componente_node)
        REFERENCES componente_node(id_componente_node)
);

INSERT INTO empresa (razao_social, cnpj, dt_registro, dominio) VALUES
('Sem empresa associada', '12345678000195', '2024-01-15', 'email.com'),
('TechCorp Solucoes em TI', '12345678000195', '2024-01-15', 'techcorp.com.br'),
('DataData HPC Solutions', '98765432000110', '2024-03-20', 'datadata.io'),
('SPTECH', '18765432000110', '2022-08-20', 'sptech.school');

INSERT INTO endereco (logradouro, numero, cidade, estado, fk_empresa) VALUES
('Av. Paulista', '1000', 'Sao Paulo', 'SP', 1),
('Rua da Assembleia', '50', 'Rio de Janeiro', 'RJ', 2);

INSERT INTO localizacao (nome, pais, estado, cidade, cod_regiao) VALUES
('Data Center SP1 - Tambore', 'Brasil', 'Sao Paulo', 'Barueri', 'BR-SE-01'),
('Data Center RJ1 - Centro', 'Brasil', 'Rio de Janeiro', 'Rio de Janeiro', 'BR-SE-02');

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

INSERT INTO usuario (nome, email_institucional, cpf, senha, verificado, fk_nivel_acesso, fk_empresa) VALUES
('Carlos Eduardo Silva', 'carlos.silva@techcorp.com.br', '11122233344', '$2a$12$eImiTXuWVxfM37uY4JANjO5E/S8f5S/5iG', 1, 1, 1),
('Mariana Souza', 'mariana.souza@techcorp.com.br', '55566677788', '$2a$12$eImiTXuWVxfM37uY4JANjO5E/S8f5S/5iG', 1, 2, 1),
('Lucas Oliveira', 'lucas.oliveira@datadata.io', '99988877766', '$2a$12$eImiTXuWVxfM37uY4JANjO5E/S8f5S/5iG', 0, 1, 2);

INSERT INTO verificacao_email (token, dt_expiracao, fk_usuario) VALUES
('a1b2c3d4e5f678901234567890abcdef', '2026-09-21 20:00:00', 3);

INSERT INTO ambiente_hpc (nome, status, fk_empresa, fk_localizacao) VALUES
('Ambiente IA & Analytics', 'ativo', 1, 1),
('Ambiente Processamento Pesado', 'manut.', 2, 2);

INSERT INTO cluster (nome, status, fk_ambiente_hpc) VALUES
('Cluster-Alpha-GPU', 'ativo', 1),
('Cluster-Beta-CPU', 'ativo', 1),
('Cluster-Gamma-Render', 'manut.', 2);

INSERT INTO node (hostname, ip, sistema_operacional, status, fk_cluster) VALUES
('node-gpu-01.techcorp.internal', '10.0.1.10', 'Ubuntu Server 22.04 LTS', 'ativo', 1),
('node-gpu-02.techcorp.internal', '10.0.1.11', 'Ubuntu Server 22.04 LTS', 'ativo', 1),
('node-cpu-01.techcorp.internal', '10.0.2.10', 'Red Hat Enterprise Linux 9', 'ativo', 2);

INSERT INTO componente (tipo, fabricante, modelo, unidade_medida) VALUES
('CPU', 'Intel', 'Xeon Platinum 8380', '%'),
('GPU', 'NVIDIA', 'H100 PCIe 80GB', '°C'),
('RAM', 'Samsung', '64GB DDR5 4800MHz', 'GB'),
('Disco', 'Kingston', 'NVMe DC1500M 3.84TB', '%');

INSERT INTO componente_node (num_serie, fk_componente, fk_node) VALUES
('CPU-INT-8380-001', 1, 1),
('GPU-NVD-H100-001', 2, 1),
('RAM-SAM-64GB-001', 3, 1),
('CPU-INT-8380-002', 1, 2),
('GPU-NVD-H100-002', 2, 2);

INSERT INTO parametro (nome, pico_max, pico_min, percentual, limite_atencao, limite_critico, fk_componente_node) VALUES
('Uso de Processamento CPU-01', 100.00, 0.00, 85.00, 80.00, 95.00, 1),
('Temperatura GPU-01', 110.00, 20.00, NULL, 75.00, 88.00, 2),
('Consumo de Memoria RAM-01', 64.00, 0.00, 90.00, 50.00, 60.00, 3),
('Temperatura GPU-02', 110.00, 20.00, NULL, 75.00, 88.00, 5);