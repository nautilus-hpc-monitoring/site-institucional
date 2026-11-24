const banco = require("../database/config");

function nodesDaEmpresa(empresa) {
    return banco.executar(
        `SELECT n.id_node, n.hostname, c.id_cluster, h.id_ambiente_hpc
        FROM node n
        JOIN cluster c ON c.id_cluster = n.fk_cluster
        JOIN ambiente_hpc h ON h.id_ambiente_hpc = c.fk_ambiente_hpc
        WHERE h.fk_empresa = ?
        ORDER BY n.hostname`,
        [empresa]
    );
}

function alertasDaSemana(empresa, inicio, fim) {
    // DB_UTC_OFFSET informa o fuso dos DATETIME gravados no banco.
    const offset = process.env.DB_UTC_OFFSET || "-03:00";
    return banco.executar(
        `SELECT n.hostname, COUNT(*) AS quantidade
        FROM alerta a
        JOIN componente_node cn ON cn.id_componente_node = a.fk_componente_node
        JOIN node n ON n.id_node = cn.fk_node
        JOIN cluster c ON c.id_cluster = n.fk_cluster
        JOIN ambiente_hpc h ON h.id_ambiente_hpc = c.fk_ambiente_hpc
        WHERE h.fk_empresa = ?
          AND a.dt_hora >= CONVERT_TZ(?, '+00:00', ?)
          AND a.dt_hora <= CONVERT_TZ(?, '+00:00', ?)
        GROUP BY n.hostname`,
        [empresa, inicio, offset, fim, offset]
    );
}

module.exports = { nodesDaEmpresa, alertasDaSemana };
