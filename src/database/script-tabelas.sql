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
	token_instalacao VARCHAR(100) UNIQUE,
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
    endereco_mac CHAR(17),
    status VARCHAR(45),
    token_node CHAR(64) UNIQUE,
    fk_cluster INT,

    FOREIGN KEY (fk_cluster) REFERENCES cluster(id)
);

CREATE TABLE componente(
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    nome_coluna VARCHAR(100) NOT NULL UNIQUE,
    funcao_psutil VARCHAR(100) NOT NULL,
    argumento_nome VARCHAR(100),
    argumento_valor VARCHAR(100),
    atributo_retorno VARCHAR(100),
    indice_retorno INT,
    unidade VARCHAR(45)
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
    FOREIGN KEY (fk_permissao) REFERENCES permissao(id),
    FOREIGN KEY (fk_nivel_acesso) REFERENCES nivel_acesso(id)
);

CREATE TABLE usuario(
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(45),
    email VARCHAR(100),
    senha VARCHAR(100),
    fk_nivel_acesso INT NOT NULL,
    fk_empresa INT NOT NULL,
    FOREIGN KEY (fk_nivel_acesso) REFERENCES nivel_acesso(id),
    FOREIGN KEY (fk_empresa) REFERENCES empresa(id)
);

CREATE TABLE componente_node(
    fk_componente INT NOT NULL,
    fk_node INT NOT NULL,
    limite_atencao DECIMAL(10,2),
    limite_critico DECIMAL(10,2),
    PRIMARY KEY (fk_componente, fk_node),
    FOREIGN KEY (fk_componente) REFERENCES componente(id),
    FOREIGN KEY (fk_node) REFERENCES node(id)
);

INSERT INTO componente
(nome, nome_coluna, funcao_psutil, argumento_nome, argumento_valor, atributo_retorno, indice_retorno, unidade)
VALUES
('Uso da CPU', 'CPU_PERCENT', 'cpu_percent', NULL, NULL, NULL, NULL, '%'),
('CPU User', 'CPU_USER_PERCENT', 'cpu_times_percent', NULL, NULL, 'user', NULL, '%'),
('CPU Nice', 'CPU_NICE_PERCENT', 'cpu_times_percent', NULL, NULL, 'nice', NULL, '%'),
('CPU System', 'CPU_SYSTEM_PERCENT', 'cpu_times_percent', NULL, NULL, 'system', NULL, '%'),
('CPU Idle', 'CPU_IDLE_PERCENT', 'cpu_times_percent', NULL, NULL, 'idle', NULL, '%'),
('CPU IOWait', 'CPU_IOWAIT_PERCENT', 'cpu_times_percent', NULL, NULL, 'iowait', NULL, '%'),
('CPU IRQ', 'CPU_IRQ_PERCENT', 'cpu_times_percent', NULL, NULL, 'irq', NULL, '%'),
('CPU Soft IRQ', 'CPU_SOFTIRQ_PERCENT', 'cpu_times_percent', NULL, NULL, 'softirq', NULL, '%'),
('CPU Steal', 'CPU_STEAL_PERCENT', 'cpu_times_percent', NULL, NULL, 'steal', NULL, '%'),
('CPU Guest', 'CPU_GUEST_PERCENT', 'cpu_times_percent', NULL, NULL, 'guest', NULL, '%'),
('CPU Guest Nice', 'CPU_GUEST_NICE_PERCENT', 'cpu_times_percent', NULL, NULL, 'guest_nice', NULL, '%'),

('Frequência atual da CPU', 'CPU_FREQ_ATUAL', 'cpu_freq', NULL, NULL, 'current', NULL, 'MHz'),
('Frequência mínima da CPU', 'CPU_FREQ_MIN', 'cpu_freq', NULL, NULL, 'min', NULL, 'MHz'),
('Frequência máxima da CPU', 'CPU_FREQ_MAX', 'cpu_freq', NULL, NULL, 'max', NULL, 'MHz'),

('Quantidade de CPUs lógicas', 'CPU_COUNT_LOGICA', 'cpu_count', 'logical', 'true', NULL, NULL, 'núcleos'),
('Quantidade de CPUs físicas', 'CPU_COUNT_FISICA', 'cpu_count', 'logical', 'false', NULL, NULL, 'núcleos'),

('Trocas de contexto', 'CPU_CTX_SWITCHES', 'cpu_stats', NULL, NULL, 'ctx_switches', NULL, 'eventos'),
('Interrupções', 'CPU_INTERRUPTS', 'cpu_stats', NULL, NULL, 'interrupts', NULL, 'eventos'),
('Interrupções de software', 'CPU_SOFT_INTERRUPTS', 'cpu_stats', NULL, NULL, 'soft_interrupts', NULL, 'eventos'),
('Chamadas de sistema', 'CPU_SYSCALLS', 'cpu_stats', NULL, NULL, 'syscalls', NULL, 'eventos'),

('Load Average 1 minuto', 'LOAD_AVG_1', 'getloadavg', NULL, NULL, NULL, 0, NULL),
('Load Average 5 minutos', 'LOAD_AVG_5', 'getloadavg', NULL, NULL, NULL, 1, NULL),
('Load Average 15 minutos', 'LOAD_AVG_15', 'getloadavg', NULL, NULL, NULL, 2, NULL),

('RAM Total', 'RAM_TOTAL', 'virtual_memory', NULL, NULL, 'total', NULL, 'bytes'),
('RAM Disponível', 'RAM_AVAILABLE', 'virtual_memory', NULL, NULL, 'available', NULL, 'bytes'),
('Uso da RAM', 'RAM_PERCENT', 'virtual_memory', NULL, NULL, 'percent', NULL, '%'),
('RAM Utilizada', 'RAM_USED', 'virtual_memory', NULL, NULL, 'used', NULL, 'bytes'),
('RAM Livre', 'RAM_FREE', 'virtual_memory', NULL, NULL, 'free', NULL, 'bytes'),
('RAM Ativa', 'RAM_ACTIVE', 'virtual_memory', NULL, NULL, 'active', NULL, 'bytes'),
('RAM Inativa', 'RAM_INACTIVE', 'virtual_memory', NULL, NULL, 'inactive', NULL, 'bytes'),
('Buffers da RAM', 'RAM_BUFFERS', 'virtual_memory', NULL, NULL, 'buffers', NULL, 'bytes'),
('Cache da RAM', 'RAM_CACHED', 'virtual_memory', NULL, NULL, 'cached', NULL, 'bytes'),
('RAM Compartilhada', 'RAM_SHARED', 'virtual_memory', NULL, NULL, 'shared', NULL, 'bytes'),
('Slab da RAM', 'RAM_SLAB', 'virtual_memory', NULL, NULL, 'slab', NULL, 'bytes'),

('SWAP Total', 'SWAP_TOTAL', 'swap_memory', NULL, NULL, 'total', NULL, 'bytes'),
('SWAP Utilizada', 'SWAP_USED', 'swap_memory', NULL, NULL, 'used', NULL, 'bytes'),
('SWAP Livre', 'SWAP_FREE', 'swap_memory', NULL, NULL, 'free', NULL, 'bytes'),
('Uso da SWAP', 'SWAP_PERCENT', 'swap_memory', NULL, NULL, 'percent', NULL, '%'),
('SWAP IN', 'SWAP_IN', 'swap_memory', NULL, NULL, 'sin', NULL, 'bytes'),
('SWAP OUT', 'SWAP_OUT', 'swap_memory', NULL, NULL, 'sout', NULL, 'bytes'),

('Disco Total', 'DISCO_TOTAL', 'disk_usage', 'path', '/', 'total', NULL, 'bytes'),
('Disco Utilizado', 'DISCO_USED', 'disk_usage', 'path', '/', 'used', NULL, 'bytes'),
('Disco Livre', 'DISCO_FREE', 'disk_usage', 'path', '/', 'free', NULL, 'bytes'),
('Uso do Disco', 'DISCO_PERCENT', 'disk_usage', 'path', '/', 'percent', NULL, '%'),

('Quantidade de Leituras', 'DISCO_READ_COUNT', 'disk_io_counters', NULL, NULL, 'read_count', NULL, 'operações'),
('Quantidade de Escritas', 'DISCO_WRITE_COUNT', 'disk_io_counters', NULL, NULL, 'write_count', NULL, 'operações'),
('Bytes Lidos', 'DISCO_READ_BYTES', 'disk_io_counters', NULL, NULL, 'read_bytes', NULL, 'bytes'),
('Bytes Escritos', 'DISCO_WRITE_BYTES', 'disk_io_counters', NULL, NULL, 'write_bytes', NULL, 'bytes'),
('Tempo de Leitura', 'DISCO_READ_TIME', 'disk_io_counters', NULL, NULL, 'read_time', NULL, 'ms'),
('Tempo de Escrita', 'DISCO_WRITE_TIME', 'disk_io_counters', NULL, NULL, 'write_time', NULL, 'ms'),
('Leituras Agrupadas', 'DISCO_READ_MERGED_COUNT', 'disk_io_counters', NULL, NULL, 'read_merged_count', NULL, 'operações'),
('Escritas Agrupadas', 'DISCO_WRITE_MERGED_COUNT', 'disk_io_counters', NULL, NULL, 'write_merged_count', NULL, 'operações'),
('Tempo Ocupado do Disco', 'DISCO_BUSY_TIME', 'disk_io_counters', NULL, NULL, 'busy_time', NULL, 'ms');

INSERT INTO empresa (id, razao_social, cnpj, dt_registro) VALUES
(1, 'Nautilus Tecnologia', '12345678000101', '2025-01-10'),
(2, 'Tech Solutions LTDA', '98765432000199', '2025-02-15'),
(3, 'Data Center Brasil', '45678912000155', '2025-03-20');

INSERT INTO endereco (id, numero, cidade, estado, logradouro, fk_empresa) VALUES
(1, '100', 'Sao Paulo', 'SP', 'Rua das Flores', 1),
(2, '250', 'Campinas', 'SP', 'Avenida Brasil', 2),
(3, '500', 'Rio de Janeiro', 'RJ', 'Rua Central', 3);

INSERT INTO nivel_acesso (id, nome) VALUES
(1, 'Administrador'),
(2, 'Tecnico'),
(3, 'Visualizador');

INSERT INTO usuario (id, nome, email, senha, fk_nivel_acesso, fk_empresa) VALUES
(1, 'Carlos', 'carlos@nautilus.com', 'senha123', 1, 1),
(2, 'Joao', 'joao@nautilus.com', 'senha456', 2, 1),
(3, 'Mariana', 'mariana@techsolutions.com', 'senha789', 1, 2),
(4, 'Lucas', 'lucas@datacenter.com', 'senha321', 3, 3);

INSERT INTO permissao (id, nome, descricao) VALUES
(1, 'Gerenciar usuarios', 'Gerenciar usuarios do sistema'),
(2, 'Visualizar dados', 'Visualizar dados dos servidores'),
(3, 'Gerenciar componentes', 'Gerenciar componentes dos nodes'),
(4, 'Gerenciar alertas', 'Gerenciar alertas do sistema');

INSERT INTO permissao_nivel_acesso (fk_permissao, fk_nivel_acesso) VALUES
(1, 1), (2, 1), (3, 1), (4, 1),
(2, 2), (3, 2), (4, 2),
(2, 3);

INSERT INTO ambiente_hpc (id, nome, descricao, status, fk_empresa) VALUES
(1, 'HPC Nautilus', 'Ambiente principal de processamento', 'ATIVO', 1),
(2, 'HPC Tech', 'Ambiente de processamento cientifico', 'ATIVO', 2),
(3, 'HPC Data Center', 'Ambiente para processamento de dados', 'MANUTENCAO', 3);

INSERT INTO cluster (id, nome, descricao, status, fk_ambiente_hpc) VALUES
(1, 'Cluster Alpha', 'Cluster principal da Nautilus', 'ATIVO', 1),
(2, 'Cluster Beta', 'Cluster secundario da Nautilus', 'ATIVO', 1),
(3, 'Cluster Gamma', 'Cluster principal da Tech Solutions', 'ATIVO', 2),
(4, 'Cluster Delta', 'Cluster do Data Center', 'MANUTENCAO', 3);

INSERT INTO node (id, hostname, ip, status, sistema_operacional, fk_cluster) VALUES
(1, 'node-alpha-01', '192.168.1.10', 'ONLINE', 'Ubuntu 22.04', 1),
(2, 'node-alpha-02', '192.168.1.11', 'ONLINE', 'Ubuntu 22.04', 1),
(3, 'node-alpha-03', '192.168.1.12', 'OFFLINE', 'Ubuntu 22.04', 1),
(4, 'node-beta-01', '192.168.2.10', 'ONLINE', 'Ubuntu 22.04', 2),
(5, 'node-beta-02', '192.168.2.11', 'ONLINE', 'Ubuntu 22.04', 2),
(6, 'node-gamma-01', '192.168.3.10', 'ONLINE', 'Ubuntu 24.04', 3),
(7, 'node-gamma-02', '192.168.3.11', 'ONLINE', 'Ubuntu 24.04', 3),
(8, 'node-delta-01', '192.168.4.10', 'OFFLINE', 'Rocky Linux 9', 4);

-- IDs dos componentes usados abaixo:
-- 1 CPU_PERCENT
-- 2 CPU_USER_PERCENT
-- 4 CPU_SYSTEM_PERCENT
-- 5 CPU_IDLE_PERCENT
-- 6 CPU_IOWAIT_PERCENT
-- 12 CPU_FREQ_ATUAL
-- 18 CPU_INTERRUPTS
-- 21 LOAD_AVG_1
-- 22 LOAD_AVG_5
-- 23 LOAD_AVG_15
-- 24 RAM_TOTAL
-- 25 RAM_AVAILABLE
-- 26 RAM_PERCENT
-- 27 RAM_USED
-- 28 RAM_FREE
-- 36 SWAP_USED
-- 37 SWAP_FREE
-- 38 SWAP_PERCENT
-- 39 SWAP_IN
-- 40 SWAP_OUT
-- 42 DISCO_USED
-- 43 DISCO_FREE
-- 44 DISCO_PERCENT

INSERT INTO componente_node
(fk_componente, fk_node, limite_atencao, limite_critico)
VALUES
(1, 1, 70, 90),
(2, 1, NULL, NULL),
(4, 1, NULL, NULL),
(5, 1, NULL, NULL),
(6, 1, NULL, NULL),
(18, 1, NULL, NULL),
(12, 1, NULL, NULL),
(21, 1, NULL, NULL),
(22, 1, NULL, NULL),
(23, 1, NULL, NULL),
(26, 1, 80, 95),
(24, 1, NULL, NULL),
(25, 1, NULL, NULL),
(27, 1, NULL, NULL),
(28, 1, NULL, NULL),
(38, 1, 70, 90),
(36, 1, NULL, NULL),
(37, 1, NULL, NULL),
(39, 1, NULL, NULL),
(40, 1, NULL, NULL),
(44, 1, 80, 95),
(42, 1, NULL, NULL),
(43, 1, NULL, NULL);

SELECT DISTINCT
    c.nome,
    c.nome_coluna,
    c.funcao_psutil,
    c.argumento_nome,
    c.argumento_valor,
    c.atributo_retorno,
    c.indice_retorno,
    c.unidade
FROM empresa e
JOIN ambiente_hpc a ON a.fk_empresa = e.id
JOIN cluster cl ON cl.fk_ambiente_hpc = a.id
JOIN node n ON n.fk_cluster = cl.id
JOIN componente_node cn ON cn.fk_node = n.id
JOIN componente c ON c.id = cn.fk_componente
WHERE e.id = 1;