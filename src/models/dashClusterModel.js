const banco = require("../database/config");
function usuario(id) {
    return banco.executar(
        "SELECT u.fk_empresa, e.sla_minutos FROM usuario u JOIN empresa e ON e.id_empresa = u.fk_empresa WHERE u.id_usuario = ?",
        [id]
    );
}
function listar(empresa) {
    return banco.executar(
        `SELECT h.id_ambiente_hpc AS hpc_id, h.nome AS hpc_nome,
        c.id_cluster AS cluster_id, c.nome AS cluster_nome, COUNT(n.id_node) AS total_nodes
        FROM ambiente_hpc h JOIN cluster c ON c.fk_ambiente_hpc = h.id_ambiente_hpc
        LEFT JOIN node n ON n.fk_cluster = c.id_cluster
        WHERE h.fk_empresa = ? GROUP BY h.id_ambiente_hpc,h.nome,c.id_cluster,c.nome ORDER BY h.nome,c.nome`,
        [empresa]
    );
}
function nodes(cluster, empresa) {
    return banco.executar(
        `SELECT n.id_node, n.hostname FROM node n
        JOIN cluster c ON c.id_cluster = n.fk_cluster
        JOIN ambiente_hpc h ON h.id_ambiente_hpc = c.fk_ambiente_hpc
        WHERE c.id_cluster = ? AND h.fk_empresa = ? ORDER BY n.hostname`,
        [cluster, empresa]
    );
}
function alertas(cluster, empresa, inicio, fim) {
    // DB_UTC_OFFSET informa o fuso dos DATETIME gravados no banco.
    const offset = process.env.DB_UTC_OFFSET || "-03:00";
    return banco.executar(
        `SELECT a.id_alerta, a.nivel, a.status, n.hostname, co.tipo AS componente,
        DATE_FORMAT(CONVERT_TZ(a.dt_hora, ?, '+00:00'), '%Y-%m-%dT%H:%i:%sZ') AS inicio,
        DATE_FORMAT(CONVERT_TZ(a.dt_fim, ?, '+00:00'), '%Y-%m-%dT%H:%i:%sZ') AS fim
        FROM alerta a JOIN componente_node cn ON cn.id_componente_node = a.fk_componente_node
        JOIN componente co ON co.id_componente = cn.fk_componente
        JOIN node n ON n.id_node = cn.fk_node JOIN cluster c ON c.id_cluster = n.fk_cluster
        JOIN ambiente_hpc h ON h.id_ambiente_hpc = c.fk_ambiente_hpc
        WHERE c.id_cluster = ? AND h.fk_empresa = ?
          AND a.dt_hora >= CONVERT_TZ(?, '+00:00', ?)
          AND a.dt_hora <= CONVERT_TZ(?, '+00:00', ?)
        ORDER BY a.dt_hora`,
        [offset, offset, cluster, empresa, inicio, offset, fim, offset]
    );
}
module.exports = { usuario, listar, nodes, alertas };
