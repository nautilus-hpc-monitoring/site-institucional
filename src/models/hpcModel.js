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
        WHERE a.fk_empresa = ?
        ORDER BY a.nome;
    `;
    return database.executar(instrucaoSql, [fkEmpresa]);
}

function cadastrarHPC(nome, status, endereco, fkEmpresa) {
    var instrucaoSql = `
        INSERT INTO ambiente_hpc (nome, status, fk_empresa, endereco_localizacao)
        VALUES (?, ?, ?, ?);
    `;
    return database.executar(instrucaoSql, [nome, status, fkEmpresa, endereco]);
}

function editarHPC(idHpc, nome, status, endereco) {
    var instrucaoSql = `
        UPDATE ambiente_hpc 
        SET nome = ?, status = ?, endereco_localizacao = ?
        WHERE id_ambiente_hpc = ?;
    `;
    return database.executar(instrucaoSql, [nome, status, endereco, idHpc]);
}

function deletarHPC(idHpc) {
    var instrucaoSql = `
        DELETE FROM ambiente_hpc WHERE id_ambiente_hpc = ?;
    `;
    return database.executar(instrucaoSql, [idHpc]);
}
//CLUSTER 
function listarClusters(idHpc) {
    var instrucaoSql = `
        SELECT c.id_cluster AS id, c.nome, c.status,
               (SELECT COUNT(*) FROM node n WHERE n.fk_cluster = c.id_cluster) AS totalNodes
        FROM cluster c
        WHERE c.fk_ambiente_hpc = ?
        ORDER BY c.nome;
    `;
    return database.executar(instrucaoSql, [idHpc]);
}

function cadastrarCluster(idHpc, nome, status) {
    var instrucaoSql = `
        INSERT INTO cluster (nome, status, fk_ambiente_hpc)
        VALUES (?, ?, ?);
    `;
    return database.executar(instrucaoSql, [nome, status, idHpc]);
}

function editarCluster(idCluster, nome, status) {
    var instrucaoSql = `
        UPDATE cluster SET nome = ?, status = ?
        WHERE id_cluster = ?;
    `;
    return database.executar(instrucaoSql, [nome, status, idCluster]);
}
function deletarCluster(idCluster) {
    var instrucaoSql = `
        DELETE FROM cluster WHERE id_cluster = ?;
    `;
    return database.executar(instrucaoSql, [idCluster]);
}



// NODE 
function listarNodes(idCluster) {
    var instrucaoSql = `
        SELECT n.id_node AS id, n.hostname, n.ip, n.sistema_operacional AS sistemaOperacional, n.status,
               (SELECT GROUP_CONCAT(DISTINCT co.tipo ORDER BY co.tipo SEPARATOR ', ')
                FROM componente_node cn JOIN componente co ON co.id_componente = cn.fk_componente
                WHERE cn.fk_node = n.id_node) AS componentes
        FROM node n
        WHERE n.fk_cluster = ?
        ORDER BY n.hostname;
    `;
    return database.executar(instrucaoSql, [idCluster]);
}

async function buscarNode(idNode) {
    var instrucaoSql = `SELECT * FROM node WHERE id_node = ?;`;
    var nodes = await database.executar(instrucaoSql, [idNode]);

    if (nodes.length == 0) return null;

    var instrucaoVinculos = `
        SELECT fk_componente, pico_max, pico_min, percentual, limite_atencao, limite_critico
        FROM componente_node
        WHERE fk_node = ?;
    `;
    var vinculos = await database.executar(instrucaoVinculos, [idNode]);

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
// Os IDs vêm do banco, pois CPU, RAM, disco e swap podem ter IDs diferentes.
function listarComponentes() {
    return database.executar(`
        SELECT id_componente AS id, tipo
        FROM componente
        ORDER BY tipo, id_componente;
    `);
}

// Campo vazio vira NULL. O número zero é mantido como zero.
function numeroOuNulo(valor) {
    return valor === "" || valor === null || valor === undefined ? null : Number(valor);
}

async function salvarComponentes(conexao, idNode, componentes) {
    var [vinculos] = await conexao.query(
        "SELECT id_componente_node, fk_componente FROM componente_node WHERE fk_node = ?;",
        [idNode]
    );

    // Atualiza o vínculo existente para manter os alertas ligados ao mesmo ID.
    for (var componente of componentes) {
        var vinculo = vinculos.find(v => v.fk_componente == componente.idComponente);
        var valores = [
            numeroOuNulo(componente.picoMax),
            numeroOuNulo(componente.picoMin),
            numeroOuNulo(componente.percentual),
            numeroOuNulo(componente.limiteAtencao),
            numeroOuNulo(componente.limiteCritico)
        ];

        if (vinculo) {
            await conexao.query(`
                UPDATE componente_node
                SET pico_max = ?, pico_min = ?, percentual = ?, limite_atencao = ?, limite_critico = ?
                WHERE id_componente_node = ?;
            `, [...valores, vinculo.id_componente_node]);
        } else {
            await conexao.query(`
                INSERT INTO componente_node
                    (pico_max, pico_min, percentual, limite_atencao, limite_critico, fk_componente, fk_node)
                VALUES (?, ?, ?, ?, ?, ?, ?);
            `, [...valores, componente.idComponente, idNode]);
        }
    }

    // Só permite retirar um componente quando ele não possui histórico de alertas.
    for (var vinculo of vinculos) {
        if (componentes.some(c => c.idComponente == vinculo.fk_componente)) continue;

        var [alertas] = await conexao.query(
            "SELECT id_alerta FROM alerta WHERE fk_componente_node = ? LIMIT 1;",
            [vinculo.id_componente_node]
        );

        if (alertas.length > 0) {
            var erro = new Error("Não é possível remover um componente que possui histórico de alertas. Mantenha-o selecionado.");
            erro.status = 409;
            throw erro;
        }

        await conexao.query("DELETE FROM componente_node WHERE id_componente_node = ?;", [vinculo.id_componente_node]);
    }
}

async function cadastrarNode(idCluster, hostname, ip, sistemaOperacional, status, componentes) {
    return database.executarTransacao(async function (conexao) {
        var [resultado] = await conexao.query(`
            INSERT INTO node (hostname, ip, sistema_operacional, status, fk_cluster)
            VALUES (?, ?, ?, ?, ?);
        `, [hostname, ip, sistemaOperacional, status, idCluster]);

        await salvarComponentes(conexao, resultado.insertId, componentes);
        return resultado;
    });
}

async function editarNode(idNode, hostname, ip, sistemaOperacional, status, componentes) {
    return database.executarTransacao(async function (conexao) {
        var [nodes] = await conexao.query("SELECT id_node FROM node WHERE id_node = ? FOR UPDATE;", [idNode]);
        if (nodes.length == 0) return { affectedRows: 0 };

        var [resultado] = await conexao.query(`
            UPDATE node
            SET hostname = ?, ip = ?, sistema_operacional = ?, status = ?
            WHERE id_node = ?;
        `, [hostname, ip, sistemaOperacional, status, idNode]);

        await salvarComponentes(conexao, idNode, componentes);
        // O SELECT já confirmou que o node existe, mesmo quando nada foi alterado.
        return { ...resultado, affectedRows: 1 };
    });
}
function deletarNode(idNode) {
    var instrucaoSql = `
        DELETE FROM node WHERE id_node = ?;
    `;
    return database.executar(instrucaoSql, [idNode]);
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
    listarComponentes,
    cadastrarNode, 
    editarNode, 
    deletarHPC,
    deletarCluster,
    deletarNode  
};
