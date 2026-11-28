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
        REFERENCES empresa(id_empresa) ON DELETE CASCADE
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
        REFERENCES permissao(id_permissao) ON DELETE CASCADE,
    CONSTRAINT cFkPnaNivelAcesso
        FOREIGN KEY (fk_nivel_acesso)
        REFERENCES nivel_acesso(id_nivel_acesso) ON DELETE CASCADE
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
        REFERENCES nivel_acesso(id_nivel_acesso) ON DELETE SET NULL,
    CONSTRAINT cFkUsuarioEmpresa
        FOREIGN KEY (fk_empresa)
        REFERENCES empresa(id_empresa) ON DELETE CASCADE
);

CREATE TABLE verificacao_email (
    id_verificacao INT PRIMARY KEY AUTO_INCREMENT,
    token VARCHAR(255) NOT NULL UNIQUE,
    dt_expiracao DATETIME NOT NULL,
    fk_usuario INT NOT NULL,
    CONSTRAINT cFkVerificacaoUsuario
        FOREIGN KEY (fk_usuario)
        REFERENCES usuario(id_usuario) ON DELETE CASCADE
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
        REFERENCES empresa(id_empresa) ON DELETE CASCADE
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
        REFERENCES ambiente_hpc(id_ambiente_hpc) ON DELETE CASCADE
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
        REFERENCES cluster(id_cluster) ON DELETE CASCADE
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
        REFERENCES componente(id_componente) ON DELETE CASCADE,
    CONSTRAINT cFkCnNode
        FOREIGN KEY (fk_node)
        REFERENCES node(id_node) ON DELETE CASCADE
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
        REFERENCES componente_node(id_componente_node) ON DELETE CASCADE
);

CREATE TABLE billing_parametro_node (
    id_billing_parametro_node INT PRIMARY KEY AUTO_INCREMENT,
    submercado VARCHAR(10) NOT NULL DEFAULT 'SE/CO',
    potencia_idle_kw DECIMAL(10,4) NOT NULL DEFAULT 0.3500,
    potencia_max_kw DECIMAL(10,4) NOT NULL DEFAULT 0.8000,
    fator_gamma DECIMAL(6,3) NOT NULL DEFAULT 1.200,
    tarifa_alpha DECIMAL(8,4) NOT NULL DEFAULT 1.0000,
    tarifa_beta DECIMAL(10,6) NOT NULL DEFAULT 0.000000,
    encargos_kwh DECIMAL(10,6) NOT NULL DEFAULT 0.120000,
    tarifa_fallback_kwh DECIMAL(10,6) NOT NULL DEFAULT 0.850000,
    amostras_calibracao INT NOT NULL DEFAULT 0,
    dt_ultima_calibracao DATETIME NULL,
    observacao VARCHAR(255) NULL,
    fk_node INT NOT NULL,

    CONSTRAINT unqBillingParametroNode
        UNIQUE (fk_node),
    CONSTRAINT ckBillingPotenciaIdle
        CHECK (potencia_idle_kw >= 0),
    CONSTRAINT ckBillingPotenciaMax
        CHECK (potencia_max_kw >= potencia_idle_kw),
    CONSTRAINT ckBillingGamma
        CHECK (fator_gamma > 0),
    CONSTRAINT ckBillingTarifaAlpha
        CHECK (tarifa_alpha >= 0),
    CONSTRAINT ckBillingEncargos
        CHECK (encargos_kwh >= 0),
    CONSTRAINT ckBillingTarifaFallback
        CHECK (tarifa_fallback_kwh >= 0),
    CONSTRAINT cFkBillingParametroNode
        FOREIGN KEY (fk_node)
        REFERENCES node(id_node) ON DELETE CASCADE
);

INSERT INTO empresa (razao_social, cnpj, dt_registro, dominio) VALUES
('Petróleo Brasileiro S.A.', '12345678000195', '2024-01-15', 'petrobras.com.br'),
('Schlumberger Serviços de Petróleo Ltda.', '98765432000110', '2024-03-20', 'slb.com.br'),
('Invision Geofísica Ltda.', '18765432000110', '2022-08-20', 'invision.io');

INSERT INTO endereco (logradouro, numero, cidade, estado, fk_empresa) VALUES
('Av. Paulista', '1000', 'Sao Paulo', 'SP', 1),
('Rua da Assembleia', '50', 'Rio de Janeiro', 'RJ', 2),
('Av. Catarinense', '667', 'Santa Catarina', 'SC', 3);

INSERT INTO nivel_acesso (nome) VALUES
('Administrador'),
('Analista de dados'),
('Operador');

INSERT INTO permissao (nome, descricao) VALUES
('LEITURA_METRICAS', 'Permite visualizar dashboards e graficos de desempenho'),
('CONFIGURAR_ALERTAS', 'Permite alterar limites de parametros e notificacoes'),
('GESTAO_DISPOSITIVOS', 'Permite cadastrar e remover nodes, clusters e componentes');

INSERT INTO permissao_nivel_acesso (fk_permissao, fk_nivel_acesso) VALUES
(1, 1), (2, 1), (3, 1),
(1, 2), (2, 2), (2,3),
(1, 3);

INSERT INTO usuario (nome, email_institucional, cpf, senha, verificado, fk_nivel_acesso, fk_empresa) VALUES
('Nina Lopes', 'nina.lopes@petrobras.com.br', '12345678901', '$2b$10$m5sQ8naAqpKorCp6JfMVe.kUcn.CyiH0VYi8vnGEUoEMQLPxOxZtu', 1, 1, 1),
('Vitor Brito', 'vitor.brito@petrobras.com.br', '12345678902', '$2b$10$m5sQ8naAqpKorCp6JfMVe.kUcn.CyiH0VYi8vnGEUoEMQLPxOxZtu', 1, 2, 1),
('Roger Machado', 'roger.machado@petrobras.com.br', '12345678903', '$2b$10$m5sQ8naAqpKorCp6JfMVe.kUcn.CyiH0VYi8vnGEUoEMQLPxOxZtu', 1, 3, 1),

('Administrador SLB', 'admin@slb.com.br', '12345678904', '$2b$10$m5sQ8naAqpKorCp6JfMVe.kUcn.CyiH0VYi8vnGEUoEMQLPxOxZtu', 1, 1, 2),
('Analista SLB', 'analista@slb.com.br', '12345678905', '$2b$10$m5sQ8naAqpKorCp6JfMVe.kUcn.CyiH0VYi8vnGEUoEMQLPxOxZtu', 1, 2, 2),
('Operador SLB', 'operador@slb.com.br', '12345678906', '$2b$10$m5sQ8naAqpKorCp6JfMVe.kUcn.CyiH0VYi8vnGEUoEMQLPxOxZtu', 1, 3, 2),

('Administrador Invision', 'admin@invision.io', '12345678907', '$2b$10$m5sQ8naAqpKorCp6JfMVe.kUcn.CyiH0VYi8vnGEUoEMQLPxOxZtu', 1, 1, 3),
('Analista Invision', 'analista@invision.io', '12345678908', '$2b$10$m5sQ8naAqpKorCp6JfMVe.kUcn.CyiH0VYi8vnGEUoEMQLPxOxZtu', 1, 2, 3),
('Operador Invision', 'operador@invision.io', '12345678909', '$2b$10$m5sQ8naAqpKorCp6JfMVe.kUcn.CyiH0VYi8vnGEUoEMQLPxOxZtu', 1, 3, 3);

INSERT INTO ambiente_hpc (nome, status, endereco_localizacao, fk_empresa) VALUES
('Ambiente IA & Analytics', 'ativo', 'Rua das Laranjas, 123', 1),
('Ambiente Processamento Pesado', 'manut.', 'Rua das Abóboras, 166', 2),
('Ambiente Simulacao DataData', 'ativo', 'Rua 7 de Setembro, 500', 3),
('Ambiente Pesquisa Pretobras', 'ativo', 'Rua Haddock Lobo, 595', 1);

INSERT INTO cluster (nome, status, fk_ambiente_hpc) VALUES
('Cluster-Alpha-GPU', 'ativo', 1),
('Cluster-Beta-CPU', 'ativo', 2),
('Cluster-Gamma-Render', 'manut.', 2),
('Cluster-Delta-DataData', 'ativo', 3),
('Cluster-Epsilon-SPTECH', 'ativo', 4);

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
('gamma-node05', '10.0.3.14', 'Ubuntu Server 22.04 LTS', 'ativo', 3),

('delta-node01', '10.0.4.10', 'Ubuntu Server 22.04 LTS', 'ativo', 4),
('delta-node02', '10.0.4.11', 'Ubuntu Server 22.04 LTS', 'ativo', 4),
('delta-node03', '10.0.4.12', 'Ubuntu Server 22.04 LTS', 'ativo', 4),
('delta-node04', '10.0.4.13', 'Ubuntu Server 22.04 LTS', 'ativo', 4),
('delta-node05', '10.0.4.14', 'Ubuntu Server 22.04 LTS', 'ativo', 4),

('epsilon-node01', '10.0.5.10', 'Ubuntu Server 22.04 LTS', 'ativo', 5),
('epsilon-node02', '10.0.5.11', 'Ubuntu Server 22.04 LTS', 'ativo', 5),
('epsilon-node03', '10.0.5.12', 'Ubuntu Server 22.04 LTS', 'ativo', 5),
('epsilon-node04', '10.0.5.13', 'Ubuntu Server 22.04 LTS', 'ativo', 5),
('epsilon-node05', '10.0.5.14', 'Ubuntu Server 22.04 LTS', 'ativo', 5);

INSERT INTO componente (tipo, fabricante, modelo, unidade_medida) VALUES
('CPU', 'Nautilus Labs', 'Perfil CPU', '%'),
('RAM', 'Nautilus Labs', 'Perfil Memória', '%'),
('SWAP', 'Nautilus Labs', 'Perfil Swap', '%'),
('DISCO', 'Nautilus Labs', 'Perfil Disco', '%');

INSERT INTO componente_node (
    pico_max,
    pico_min,
    percentual,
    limite_atencao,
    limite_critico,
    fk_componente,
    fk_node
)
SELECT
    100,
    0,
    5,
    CASE c.tipo
        WHEN 'CPU' THEN 68 + MOD(n.id_node, 5)
        WHEN 'RAM' THEN 72 + MOD(n.id_node, 5)
        WHEN 'SWAP' THEN 5 + MOD(n.id_node, 5)
        ELSE 76 + MOD(n.id_node, 5)
    END AS limite_atencao,
    CASE c.tipo
        WHEN 'CPU' THEN 84 + MOD(n.id_node, 5)
        WHEN 'RAM' THEN 88 + MOD(n.id_node, 5)
        WHEN 'SWAP' THEN 10 + MOD(n.id_node, 5)
        ELSE 90 + MOD(n.id_node, 5)
    END AS limite_critico,
    c.id_componente,
    n.id_node
FROM node n
JOIN componente c ON c.tipo IN ('CPU', 'RAM', 'SWAP', 'DISCO');

INSERT INTO billing_parametro_node (
    submercado,
    potencia_idle_kw,
    potencia_max_kw,
    fator_gamma,
    tarifa_alpha,
    tarifa_beta,
    encargos_kwh,
    tarifa_fallback_kwh,
    observacao,
    fk_node
)
SELECT
    'SE/CO',
    ROUND(0.2200 + (MOD(n.id_node, 5) * 0.0700) + (FLOOR((n.id_node - 1) / 5) * 0.0300), 4),
    ROUND(0.6500 + (MOD(n.id_node, 5) * 0.1500) + (FLOOR((n.id_node - 1) / 5) * 0.0800), 4),
    ROUND(1.080 + (MOD(n.id_node, 4) * 0.080), 3),
    ROUND(0.8800 + (MOD(n.id_node, 6) * 0.0700), 4),
    ROUND((MOD(n.id_node, 3) - 1) * 0.004500, 6),
    ROUND(0.090000 + (MOD(n.id_node, 4) * 0.018000), 6),
    ROUND(0.780000 + (MOD(n.id_node, 5) * 0.040000), 6),
    'Parâmetro inicial. Recalibrar após dados reais.',
    n.id_node
FROM node n;

-- Povoamento inicial de alertas para alimentar dashboards que consultam o banco.
-- Gera ocorrencias diariamente de 01/09 ate 15/11 (ano de referencia) para CPU, RAM, SWAP e DISCO.
-- Versao sem CTE (compatível com MySQL 5.7+).
INSERT INTO alerta (
    titulo,
    descricao,
    nivel,
    valor_capturado,
    dt_hora,
    fk_componente_node
)
SELECT
    CONCAT(
        CASE
            WHEN seq.seq = 3 OR (seq.seq = 2 AND base.fator_custo >= 0.86) THEN 'Critico'
            ELSE 'Aviso'
        END,
        ' de ', base.tipo,
        ' no node ', base.hostname
    ) AS titulo,
    CONCAT(
        'Leitura de ', base.tipo,
        ' em linha com o pico de custo diário (fator ', ROUND(base.fator_custo * 100, 1), '%) para o node ',
        base.hostname, ' no dia ', DATE_FORMAT(base.dia, '%d/%m/%Y'), '.'
    ) AS descricao,
    CASE
        WHEN seq.seq = 3 OR (seq.seq = 2 AND base.fator_custo >= 0.86) THEN 'critico'
        ELSE 'aviso'
    END AS nivel,
    ROUND(
        CASE
            WHEN seq.seq = 3 OR (seq.seq = 2 AND base.fator_custo >= 0.86)
                THEN base.limite_critico + 1 + (base.fator_custo * 6)
            ELSE base.limite_atencao + 1 + (base.fator_custo * 5)
        END,
        2
    ) AS valor_capturado,
    TIMESTAMP(
        base.dia,
        MAKETIME(
            MOD((base.id_node * 3) + (base.id_componente * 5) + DAY(base.dia) + seq.seq, 24),
            MOD((base.id_node * 7) + (base.id_componente * 11) + (seq.seq * 13), 60),
            0
        )
    ) AS dt_hora,
    base.id_componente_node AS fk_componente_node
FROM (
    SELECT
        d.dia,
        cn.id_componente_node,
        n.id_node,
        n.hostname,
        c.id_componente,
        c.tipo,
        cn.limite_atencao,
        cn.limite_critico,
        LEAST(
            1,
            GREATEST(
                0,
                ((SIN((2 * PI()) * (WEEKDAY(d.dia) / 7.0) + (n.id_node / 5.0)) + 1) / 2)
                + CASE
                    WHEN MOD(n.id_node, 5) = 0 THEN 0.18
                    WHEN MOD(n.id_node, 5) = 4 THEN 0.10
                    WHEN MOD(n.id_node, 5) = 1 THEN -0.08
                    ELSE 0
                  END
            )
        ) AS fator_custo
    FROM (
        SELECT DATE_ADD(base.inicio, INTERVAL seq.n DAY) AS dia
        FROM (
            SELECT u.n + (d.n * 10) AS n
            FROM (
                SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
            ) u
            CROSS JOIN (
                SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
            ) d
        ) seq
        CROSS JOIN (
            SELECT
                STR_TO_DATE(
                    CONCAT(
                        CASE WHEN MONTH(CURDATE()) >= 9 THEN YEAR(CURDATE()) ELSE YEAR(CURDATE()) - 1 END,
                        '-09-01'
                    ),
                    '%Y-%m-%d'
                ) AS inicio,
                STR_TO_DATE(
                    CONCAT(
                        CASE WHEN MONTH(CURDATE()) >= 9 THEN YEAR(CURDATE()) ELSE YEAR(CURDATE()) - 1 END,
                        '-11-15'
                    ),
                    '%Y-%m-%d'
                ) AS fim
        ) base
        WHERE DATE_ADD(base.inicio, INTERVAL seq.n DAY) <= base.fim
    ) d
    JOIN componente_node cn ON 1 = 1
    JOIN componente c ON c.id_componente = cn.fk_componente
    JOIN node n ON n.id_node = cn.fk_node
    WHERE c.tipo IN ('CPU', 'RAM', 'SWAP', 'DISCO')
) base
JOIN (
    SELECT 1 AS seq
    UNION ALL SELECT 2
    UNION ALL SELECT 3
) seq
    ON seq.seq <= CASE
        WHEN base.fator_custo >= 0.82 THEN 3
        WHEN base.fator_custo >= 0.62 THEN 2
        WHEN base.fator_custo >= 0.42 THEN 1
        ELSE 0
    END
LEFT JOIN alerta a
    ON a.fk_componente_node = base.id_componente_node
   AND a.dt_hora = TIMESTAMP(
        base.dia,
        MAKETIME(
            MOD((base.id_node * 3) + (base.id_componente * 5) + DAY(base.dia) + seq.seq, 24),
            MOD((base.id_node * 7) + (base.id_componente * 11) + (seq.seq * 13), 60),
            0
        )
    )
WHERE a.id_alerta IS NULL;
