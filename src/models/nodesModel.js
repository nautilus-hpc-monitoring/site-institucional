var database = require("../database/config");

function chamarHPC(fk_empresa) {
    var instrucaoSql = `  SELECT 
            id,
            nome,
            fk_empresa
        FROM ambiente_hpc
        WHERE fk_empresa = ${fk_empresa};
    `;

    return database.executar(instrucaoSql);
}

function chamarCluster(fk_ambiente_hpc) {
    var instrucaoSql = ` SELECT
            id,
            nome,
            fk_ambiente_hpc
        FROM cluster
        WHERE fk_ambiente_hpc = ${fk_ambiente_hpc};`;
    return database.executar(instrucaoSql);
}


function cadastrar(hostname, ip, status, sistemaOperacional, clusterFk, tokenNode) {
    var instrucaoSql = `
        INSERT INTO node
        (hostname, ip, status, sistema_operacional, fk_cluster, token_node)
        VALUES
        ('${hostname}', '${ip}', '${status}', '${sistemaOperacional}', ${clusterFk}, '${tokenNode}');
    `;

    return database.executar(instrucaoSql);
}

function ativarAgente(tokenInstalacao, hostname) {
    var instrucaoSql = `
        SELECT
            n.id,
            n.hostname,
            n.token_node,
            n.endereco_mac
        FROM node n
        JOIN cluster c
            ON n.fk_cluster = c.id
        JOIN ambiente_hpc ah
            ON c.fk_ambiente_hpc = ah.id
        JOIN empresa e
            ON ah.fk_empresa = e.id
        WHERE e.token_instalacao = '${tokenInstalacao}'
          AND n.hostname = '${hostname}';
    `;

    return database.executar(instrucaoSql);
}

function salvarMac(idNode, enderecoMac) {
    var instrucaoSql = `
        UPDATE node
        SET endereco_mac = '${enderecoMac}'
        WHERE id = ${idNode};
    `;

    return database.executar(instrucaoSql);
}

module.exports = {
    cadastrar,
    chamarHPC,
    chamarCluster,
    ativarAgente,
    salvarMac
};

