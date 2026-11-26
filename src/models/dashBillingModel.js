const banco = require('../database/config');

// Descobre a empresa do usuário para limitar o escopo das consultas.
function usuarioEmpresa(idUsuario) {
    return banco.executar(
        `SELECT fk_empresa
         FROM usuario
         WHERE id_usuario = ?`,
        [idUsuario]
    );
}

// Série diária de custo/consumo/tarifa no período solicitado.
function billingPorDia(idEmpresa, inicio, fim) {
    return banco.executar(
        `SELECT DATE_FORMAT(b.dt_hora, '%Y-%m-%d') AS dia,
                SUM(b.custo_estimado) AS custo_dia,
                SUM(b.consumo_kwh) AS consumo_dia,
                AVG(b.tarifa_kwh) AS tarifa_media_dia
         FROM billing_node_horario b
         JOIN node n ON n.id_node = b.fk_node
         JOIN cluster c ON c.id_cluster = n.fk_cluster
         JOIN ambiente_hpc h ON h.id_ambiente_hpc = c.fk_ambiente_hpc
         WHERE h.fk_empresa = ?
           AND b.dt_hora >= ?
           AND b.dt_hora < ?
         GROUP BY DATE_FORMAT(b.dt_hora, '%Y-%m-%d')
         ORDER BY dia`,
        [idEmpresa, inicio, fim]
    );
}

// Totais do período para métricas mensais e referência de tarifa.
function resumoPeriodo(idEmpresa, inicio, fim) {
    return banco.executar(
        `SELECT COALESCE(SUM(b.custo_estimado), 0) AS custo_total,
                COALESCE(SUM(b.consumo_kwh), 0) AS consumo_total,
                COALESCE(AVG(b.tarifa_kwh), 0) AS tarifa_media
         FROM billing_node_horario b
         JOIN node n ON n.id_node = b.fk_node
         JOIN cluster c ON c.id_cluster = n.fk_cluster
         JOIN ambiente_hpc h ON h.id_ambiente_hpc = c.fk_ambiente_hpc
         WHERE h.fk_empresa = ?
           AND b.dt_hora >= ?
           AND b.dt_hora < ?`,
        [idEmpresa, inicio, fim]
    );
}

// Alertas diários por nível para alimentar barras do gráfico 1.
function alertasPorDia(idEmpresa, inicio, fim) {
    return banco.executar(
        `SELECT DATE_FORMAT(a.dt_hora, '%Y-%m-%d') AS dia,
                SUM(CASE WHEN LOWER(a.nivel) = 'aviso' THEN 1 ELSE 0 END) AS qtd_aviso,
                SUM(CASE WHEN LOWER(a.nivel) = 'critico' THEN 1 ELSE 0 END) AS qtd_critico
         FROM alerta a
         JOIN componente_node cn ON cn.id_componente_node = a.fk_componente_node
         JOIN node n ON n.id_node = cn.fk_node
         JOIN cluster c ON c.id_cluster = n.fk_cluster
         JOIN ambiente_hpc h ON h.id_ambiente_hpc = c.fk_ambiente_hpc
         WHERE h.fk_empresa = ?
           AND a.dt_hora >= ?
           AND a.dt_hora < ?
         GROUP BY DATE_FORMAT(a.dt_hora, '%Y-%m-%d')
         ORDER BY dia`,
        [idEmpresa, inicio, fim]
    );
}

// Ranking de nodes com maior impacto de custo no mês.
function rankingNodes(idEmpresa, inicio, fim) {
    return banco.executar(
        `SELECT n.id_node,
                n.hostname,
                COALESCE(SUM(b.custo_estimado), 0) AS custo_total,
                COALESCE(SUM(b.consumo_kwh), 0) AS consumo_total
         FROM billing_node_horario b
         JOIN node n ON n.id_node = b.fk_node
         JOIN cluster c ON c.id_cluster = n.fk_cluster
         JOIN ambiente_hpc h ON h.id_ambiente_hpc = c.fk_ambiente_hpc
         WHERE h.fk_empresa = ?
           AND b.dt_hora >= ?
           AND b.dt_hora < ?
         GROUP BY n.id_node, n.hostname
         ORDER BY custo_total DESC`,
        [idEmpresa, inicio, fim]
    );
}

// Contagem mensal de alertas por node para tooltip do gráfico 3.
function alertasPorNode(idEmpresa, inicio, fim) {
    return banco.executar(
        `SELECT n.id_node,
                SUM(CASE WHEN LOWER(a.nivel) = 'aviso' THEN 1 ELSE 0 END) AS qtd_aviso,
                SUM(CASE WHEN LOWER(a.nivel) = 'critico' THEN 1 ELSE 0 END) AS qtd_critico
         FROM node n
         JOIN cluster c ON c.id_cluster = n.fk_cluster
         JOIN ambiente_hpc h ON h.id_ambiente_hpc = c.fk_ambiente_hpc
         LEFT JOIN componente_node cn ON cn.fk_node = n.id_node
         LEFT JOIN alerta a
                ON a.fk_componente_node = cn.id_componente_node
               AND a.dt_hora >= ?
               AND a.dt_hora < ?
         WHERE h.fk_empresa = ?
         GROUP BY n.id_node`,
        [inicio, fim, idEmpresa]
    );
}

function mesesComDados(idEmpresa) {
    return banco.executar(
        `SELECT DISTINCT DATE_FORMAT(b.dt_hora, '%Y-%m') AS mes
         FROM billing_node_horario b
         JOIN node n ON n.id_node = b.fk_node
         JOIN cluster c ON c.id_cluster = n.fk_cluster
         JOIN ambiente_hpc h ON h.id_ambiente_hpc = c.fk_ambiente_hpc
         WHERE h.fk_empresa = ?
         ORDER BY mes ASC`,
        [idEmpresa]
    );
}

module.exports = {
    usuarioEmpresa,
    billingPorDia,
    resumoPeriodo,
    alertasPorDia,
    rankingNodes,
    alertasPorNode,
    mesesComDados
};
