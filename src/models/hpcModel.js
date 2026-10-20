var database = require("../database/config");

// HPC 
function listarHPC(fkEmpresa) {
    var instrucaoSql = `
        SELECT a.id_ambiente_hpc AS id, 
               a.nome, 
               a.status, 
               a.endereco_localizacao AS localizacao,
               (SELECT COUNT(*) FROM cluster c WHERE c.fk_ambiente_hpc = a.id_ambiente_hpc) AS totalClusters
        FROM ambiente_hpc a
        WHERE a.fk_empresa = ${fkEmpresa}
        ORDER BY a.nome;
    `;
    return database.executar(instrucaoSql);
}

function cadastrarHPC(nome, status, endereco, fkEmpresa) {
    var instrucaoSql = `
        INSERT INTO ambiente_hpc (nome, status, fk_empresa, endereco_localizacao)
        VALUES ('${nome}', '${status}', ${fkEmpresa}, '${endereco}'); 
    `;
    return database.executar(instrucaoSql);
}

function editarHPC(idHpc, nome, status, endereco) {
    var instrucaoSql = `
        UPDATE ambiente_hpc 
        SET nome = '${nome}', status = '${status}', endereco_localizacao = '${endereco}'
        WHERE id_ambiente_hpc = ${idHpc};
    `;
    return database.executar(instrucaoSql);
}

function deletarHPC(idHpc) {
    var instrucaoSql = `
        DELETE FROM ambiente_hpc WHERE id_ambiente_hpc = ${idHpc};
    `;
    return database.executar(instrucaoSql);
}
//CLUSTER 
function listarClusters(idHpc) {
    var instrucaoSql = `
        SELECT c.id_cluster AS id, c.nome, c.status,
               (SELECT COUNT(*) FROM node n WHERE n.fk_cluster = c.id_cluster) AS totalNodes
        FROM cluster c
        WHERE c.fk_ambiente_hpc = ${idHpc}
        ORDER BY c.nome;
    `;
    return database.executar(instrucaoSql);
}

function cadastrarCluster(idHpc, nome, status) {
    var instrucaoSql = `
        INSERT INTO cluster (nome, status, fk_ambiente_hpc)
        VALUES ('${nome}', '${status}', ${idHpc});
    `;
    return database.executar(instrucaoSql);
}

function editarCluster(idCluster, nome, status) {
    var instrucaoSql = `
        UPDATE cluster SET nome = '${nome}', status = '${status}'
        WHERE id_cluster = ${idCluster};
    `;
    return database.executar(instrucaoSql);
}
function deletarCluster(idCluster) {
    var instrucaoSql = `
        DELETE FROM cluster WHERE id_cluster = ${idCluster};
    `;
    return database.executar(instrucaoSql);
}



// NODE 
function listarNodes(idCluster) {
    var instrucaoSql = `
        SELECT n.id_node AS id, n.hostname, n.ip, n.sistema_operacional AS sistemaOperacional, n.status,
               (SELECT GROUP_CONCAT(DISTINCT co.tipo ORDER BY co.tipo SEPARATOR ', ')
                FROM componente_node cn JOIN componente co ON co.id_componente = cn.fk_componente
                WHERE cn.fk_node = n.id_node) AS componentes
        FROM node n
        WHERE n.fk_cluster = ${idCluster}
        ORDER BY n.hostname;
    `;
    return database.executar(instrucaoSql);
}

async function buscarNode(idNode) {
    var instrucaoSql = `SELECT * FROM node WHERE id_node = ${idNode};`;
    var nodes = await database.executar(instrucaoSql);

    if (nodes.length == 0) return null;

    var instrucaoVinculos = `
        SELECT fk_componente, pico_max, pico_min, percentual, limite_atencao, limite_critico
        FROM componente_node
        WHERE fk_node = ${idNode};
    `;
    var vinculos = await database.executar(instrucaoVinculos);

    nodes[0].componentes = vinculos.map(v => ({
        idComponente: v.fk_componente,
        picoMax: v.pico_max,
        picoMin: v.pico_min,
        percentual: v.percentual,
        limiteAtencao: v.limite_atencao,
        limiteCritico: v.limite_critico
    }));
    return nodes[0];
}
const formatarSQL = (valor) => valor ? valor : 'NULL';

async function cadastrarNode(idCluster, hostname, ip, sistemaOperacional, status, componentes) {
    var instrucaoSql = `
        INSERT INTO node (hostname, ip, sistema_operacional, status, fk_cluster)
        VALUES ('${hostname}', '${ip}', '${sistemaOperacional}', '${status}', ${idCluster});
    `;
    var resultado = await database.executar(instrucaoSql);

    if (componentes.length > 0) {
        
        var valores = componentes.map(c =>
            `('Padrão', ${formatarSQL(c.picoMax)}, ${formatarSQL(c.picoMin)}, ${formatarSQL(c.percentual)}, ${formatarSQL(c.limiteAtencao)}, ${formatarSQL(c.limiteCritico)}, ${c.idComponente}, ${resultado.insertId})`
        ).join(", ");

        var instrucaoVinculos = `
            INSERT INTO componente_node (nome_parametro, pico_max, pico_min, percentual, limite_atencao, limite_critico, fk_componente, fk_node) 
            VALUES ${valores};
        `;
        await database.executar(instrucaoVinculos);
    }
    return resultado;
}

async function editarNode(idNode, hostname, ip, sistemaOperacional, status, componentes) {
    var instrucaoSql = `
        UPDATE node 
        SET hostname = '${hostname}', ip = '${ip}', sistema_operacional = '${sistemaOperacional}', status = '${status}'
        WHERE id_node = ${idNode};
    `;
    var resultado = await database.executar(instrucaoSql);

    await database.executar(`DELETE FROM componente_node WHERE fk_node = ${idNode};`);

    if (componentes.length > 0) {
        var valores = componentes.map(c =>
            `('Padrão', ${formatarSQL(c.picoMax)}, ${formatarSQL(c.picoMin)}, ${formatarSQL(c.percentual)}, ${formatarSQL(c.limiteAtencao)}, ${formatarSQL(c.limiteCritico)}, ${c.idComponente}, ${idNode})`
        ).join(", ");

        var instrucaoVinculos = `
            INSERT INTO componente_node (nome_parametro, pico_max, pico_min, percentual, limite_atencao, limite_critico, fk_componente, fk_node) 
            VALUES ${valores};
        `;
        await database.executar(instrucaoVinculos);
    }
    return resultado;
}
function deletarNode(idNode) {
    var instrucaoSql = `
        DELETE FROM node WHERE id_node = ${idNode};
    `;
    return database.executar(instrucaoSql);
}

module.exports = {
    listarHPC, 
    cadastrarHPC, 
    editarHPC,
    listarClusters, 
    cadastrarCluster, 
    editarCluster, 
    listarNodes, 
    buscarNode, 
    cadastrarNode, 
    editarNode, 
    deletarHPC,
    deletarCluster,
    deletarNode  
};