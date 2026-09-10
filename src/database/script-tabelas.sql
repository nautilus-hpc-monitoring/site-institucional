DROP USER IF EXISTS 'user_admin'@'localhost';
CREATE USER 'user_admin'@'localhost' IDENTIFIED BY 'SPTech#2026';
GRANT ALL PRIVILEGES ON nautilus.* TO 'user_admin'@'localhost';
FLUSH PRIVILEGES;

DROP DATABASE IF EXISTS nautilus;
CREATE DATABASE nautilus;
USE nautilus;


CREATE TABLE empresa(
    id INT PRIMARY KEY AUTO_INCREMENT,
    razao_social VARCHAR(45),
    cnpj CHAR(14),
    dt_registro DATE
);


CREATE TABLE endereco(
    id INT PRIMARY KEY AUTO_INCREMENT,
    numero VARCHAR(10),
    cidade VARCHAR(45),
    estado CHAR(2),
    logradouro VARCHAR(100),
    fk_empresa INT NOT NULL,

    FOREIGN KEY (fk_empresa) REFERENCES empresa(id)
);


CREATE TABLE ambiente_hpc(
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(45),
    descricao VARCHAR(100),
    status VARCHAR(45),
    fk_empresa INT NOT NULL,

    FOREIGN KEY (fk_empresa) REFERENCES empresa(id)
);


CREATE TABLE cluster(
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(45),
    descricao VARCHAR(100),
    status VARCHAR(45),
    fk_ambiente_hpc INT NOT NULL,

    FOREIGN KEY (fk_ambiente_hpc) REFERENCES ambiente_hpc(id)
);


CREATE TABLE node (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hostname VARCHAR(255),
    ip VARCHAR(45),
    sistema_operacional VARCHAR(100),
    status VARCHAR(45),
    fk_cluster INT,

    FOREIGN KEY (fk_cluster) REFERENCES cluster(id)
);


CREATE TABLE componente(
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    unidade VARCHAR(45),
    parametro VARCHAR(100) NOT NULL UNIQUE
);


CREATE TABLE nivel_acesso(
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(45)
);


CREATE TABLE permissao(
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(45),
    descricao VARCHAR(100)
);


CREATE TABLE permissao_nivel_acesso(
    fk_permissao INT NOT NULL,
    fk_nivel_acesso INT NOT NULL,

    PRIMARY KEY (fk_permissao, fk_nivel_acesso),

    FOREIGN KEY (fk_permissao)
        REFERENCES permissao(id),

    FOREIGN KEY (fk_nivel_acesso)
        REFERENCES nivel_acesso(id)
);


CREATE TABLE usuario(
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(45),
    email VARCHAR(100),
    senha VARCHAR(100),
    fk_nivel_acesso INT NOT NULL,
    fk_empresa INT NOT NULL,

    FOREIGN KEY (fk_nivel_acesso)
        REFERENCES nivel_acesso(id),

    FOREIGN KEY (fk_empresa)
        REFERENCES empresa(id)
);

CREATE TABLE componente_node(
    fk_componente INT NOT NULL,
    fk_node INT NOT NULL,
    limite_atencao DECIMAL(10,2),
    limite_critico DECIMAL(10,2),

    PRIMARY KEY (fk_componente, fk_node),

    FOREIGN KEY (fk_componente)
        REFERENCES componente(id),

    FOREIGN KEY (fk_node)
        REFERENCES node(id)
);

INSERT INTO empresa
(razao_social, cnpj, dt_registro)
VALUES
('Petrobras', '12345678000101', '2025-01-10'),
('Tech Solutions LTDA', '98765432000199', '2025-02-15'),
('Data Center Brasil', '45678912000155', '2025-03-20');

INSERT INTO endereco
(numero, cidade, estado, logradouro, fk_empresa)
VALUES
('100', 'Sao Paulo', 'SP', 'Rua das Flores', 1),
('250', 'Campinas', 'SP', 'Avenida Brasil', 2),
('500', 'Rio de Janeiro', 'RJ', 'Rua Central', 3);

INSERT INTO nivel_acesso
(nome)
VALUES
('admin'),
('gestores'),
('operadores');

INSERT INTO usuario
(nome, email, senha, fk_nivel_acesso, fk_empresa)
VALUES
('Carlos', 'carlos@petrobras.com', 'senha123', 1, 1),
('Joao', 'joao@nautilus.com', 'senha456', 2, 1),
('Mariana', 'mariana@techsolutions.com', 'senha789', 1, 2),
('Lucas', 'lucas@datacenter.com', 'senha321', 3, 3);


INSERT INTO permissao
(nome, descricao)
VALUES
('Gerenciar usuarios', 'Gerenciar usuarios do sistema'),
('Visualizar dados', 'Visualizar dados dos servidores'),
('Gerenciar componentes', 'Gerenciar componentes dos nodes'),
('Gerenciar alertas', 'Gerenciar alertas do sistema');


INSERT INTO permissao_nivel_acesso
(fk_permissao, fk_nivel_acesso)
VALUES
(1, 1),
(2, 1),
(3, 1),
(4, 1),

(2, 2),
(3, 2),
(4, 2),

(2, 3);

INSERT INTO ambiente_hpc
(nome, descricao, status, fk_empresa)
VALUES
('HPC Nautilus', 'Ambiente principal de processamento', 'ATIVO', 1),
('HPC Tech', 'Ambiente de processamento cientifico', 'ATIVO', 2),
('HPC Data Center', 'Ambiente para processamento de dados', 'MANUTENCAO', 3);

INSERT INTO cluster
(nome, descricao, status, fk_ambiente_hpc)
VALUES
('Cluster Alpha', 'Cluster principal da Nautilus', 'ATIVO', 1),
('Cluster Beta', 'Cluster secundario da Nautilus', 'ATIVO', 1),
('Cluster Gamma', 'Cluster principal da Tech Solutions', 'ATIVO', 2),
('Cluster Delta', 'Cluster do Data Center', 'MANUTENCAO', 3);

INSERT INTO node
(hostname, ip, status, sistema_operacional, fk_cluster)
VALUES
('node-alpha-01', '192.168.1.10', 'ONLINE', 'Ubuntu 22.04', 1),
('node-alpha-02', '192.168.1.11', 'ONLINE', 'Ubuntu 22.04', 1),
('node-alpha-03', '192.168.1.12', 'OFFLINE', 'Ubuntu 22.04', 1),

('node-beta-01', '192.168.2.10', 'ONLINE', 'Ubuntu 22.04', 2),
('node-beta-02', '192.168.2.11', 'ONLINE', 'Ubuntu 22.04', 2),

('node-gamma-01', '192.168.3.10', 'ONLINE', 'Ubuntu 24.04', 3),
('node-gamma-02', '192.168.3.11', 'ONLINE', 'Ubuntu 24.04', 3),

('node-delta-01', '192.168.4.10', 'OFFLINE', 'Rocky Linux 9', 4);

INSERT INTO componente
(nome, unidade, parametro)
VALUES

('Uso da CPU', '%', 'CPU_PERCENT'),
('CPU User', '%', 'CPU_USER_PERCENT'),
('CPU Nice', '%', 'CPU_NICE_PERCENT'),
('CPU System', '%', 'CPU_SYSTEM_PERCENT'),
('CPU Idle', '%', 'CPU_IDLE_PERCENT'),
('CPU IOWait', '%', 'CPU_IOWAIT_PERCENT'),
('CPU IRQ', '%', 'CPU_IRQ_PERCENT'),
('CPU Soft IRQ', '%', 'CPU_SOFTIRQ_PERCENT'),
('CPU Steal', '%', 'CPU_STEAL_PERCENT'),
('CPU Guest', '%', 'CPU_GUEST_PERCENT'),
('CPU Guest Nice', '%', 'CPU_GUEST_NICE_PERCENT'),

('Frequência atual da CPU', 'MHz', 'CPU_FREQ_ATUAL'),
('Frequência mínima da CPU', 'MHz', 'CPU_FREQ_MIN'),
('Frequência máxima da CPU', 'MHz', 'CPU_FREQ_MAX'),

('Quantidade de CPUs lógicas', 'núcleos', 'CPU_COUNT_LOGICA'),
('Quantidade de CPUs físicas', 'núcleos', 'CPU_COUNT_FISICA'),

('Trocas de contexto', 'eventos', 'CPU_CTX_SWITCHES'),
('Interrupções', 'eventos', 'CPU_INTERRUPTS'),
('Interrupções de software', 'eventos', 'CPU_SOFT_INTERRUPTS'),
('Chamadas de sistema', 'eventos', 'CPU_SYSCALLS'),

('Load Average 1 minuto', NULL, 'LOAD_AVG_1'),
('Load Average 5 minutos', NULL, 'LOAD_AVG_5'),
('Load Average 15 minutos', NULL, 'LOAD_AVG_15'),

('RAM Total', 'bytes', 'RAM_TOTAL'),
('RAM Disponível', 'bytes', 'RAM_AVAILABLE'),
('Uso da RAM', '%', 'RAM_PERCENT'),
('RAM Utilizada', 'bytes', 'RAM_USED'),
('RAM Livre', 'bytes', 'RAM_FREE'),
('RAM Ativa', 'bytes', 'RAM_ACTIVE'),
('RAM Inativa', 'bytes', 'RAM_INACTIVE'),
('Buffers da RAM', 'bytes', 'RAM_BUFFERS'),
('Cache da RAM', 'bytes', 'RAM_CACHED'),
('RAM Compartilhada', 'bytes', 'RAM_SHARED'),
('Slab da RAM', 'bytes', 'RAM_SLAB'),

('SWAP Total', 'bytes', 'SWAP_TOTAL'),
('SWAP Utilizada', 'bytes', 'SWAP_USED'),
('SWAP Livre', 'bytes', 'SWAP_FREE'),
('Uso da SWAP', '%', 'SWAP_PERCENT'),
('SWAP IN', 'bytes', 'SWAP_IN'),
('SWAP OUT', 'bytes', 'SWAP_OUT'),


('Disco Total', 'bytes', 'DISCO_TOTAL'),
('Disco Utilizado', 'bytes', 'DISCO_USED'),
('Disco Livre', 'bytes', 'DISCO_FREE'),
('Uso do Disco', '%', 'DISCO_PERCENT'),

('Quantidade de Leituras', 'operações', 'DISCO_READ_COUNT'),
('Quantidade de Escritas', 'operações', 'DISCO_WRITE_COUNT'),
('Bytes Lidos', 'bytes', 'DISCO_READ_BYTES'),
('Bytes Escritos', 'bytes', 'DISCO_WRITE_BYTES'),
('Tempo de Leitura', 'ms', 'DISCO_READ_TIME'),
('Tempo de Escrita', 'ms', 'DISCO_WRITE_TIME'),
('Leituras Agrupadas', 'operações', 'DISCO_READ_MERGED_COUNT'),
('Escritas Agrupadas', 'operações', 'DISCO_WRITE_MERGED_COUNT'),
('Tempo Ocupado do Disco', 'ms', 'DISCO_BUSY_TIME');

INSERT INTO componente_node
(fk_componente, fk_node, limite_atencao, limite_critico)
VALUES

-- CPU
(1, 1, 70, 90),
(2, 1, NULL, NULL),
(4, 1, NULL, NULL),
(5, 1, NULL, NULL),
(6, 1, NULL, NULL),
(12, 1, NULL, NULL),
(18, 1, NULL, NULL),

-- Load Average
(21, 1, NULL, NULL),
(22, 1, NULL, NULL),
(23, 1, NULL, NULL),

-- RAM
(24, 1, NULL, NULL),
(25, 1, NULL, NULL),
(26, 1, 80, 95),
(27, 1, NULL, NULL),
(28, 1, NULL, NULL),

-- SWAP
(36, 1, NULL, NULL),
(37, 1, NULL, NULL),
(38, 1, 70, 90),
(39, 1, NULL, NULL),
(40, 1, NULL, NULL),

-- DISCO
(42, 1, NULL, NULL),
(43, 1, NULL, NULL),
(44, 1, 80, 95);

SELECT DISTINCT
    c.id,
    c.nome,
    c.unidade,
    c.parametro,
    cn.limite_atencao,
    cn.limite_critico
FROM empresa e
JOIN ambiente_hpc a
    ON a.fk_empresa = e.id
JOIN cluster cl
    ON cl.fk_ambiente_hpc = a.id
JOIN node n
    ON n.fk_cluster = cl.id
JOIN componente_node cn
    ON cn.fk_node = n.id
JOIN componente c
    ON c.id = cn.fk_componente
WHERE e.id = 1;

