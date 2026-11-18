// Consulta parametrizada: identifica a empresa a partir do usuário autenticado.
const banco = require('../database/config');

function listar(usuarioId, filtros) {
    const parametros = [usuarioId];
    const condicoes = ['u.id_usuario = ?'];
    if (filtros.servidor) {
        // ! escapa curingas: % e _ digitados são parte do nome procurado.
        const busca = filtros.servidor.replace(/[!%_]/g, valor => '!' + valor);
        condicoes.push("n.hostname LIKE ? ESCAPE '!'");
        parametros.push('%' + busca + '%');
    }
    if (filtros.status) {
        condicoes.push("a.status IN (?, ?)");
        parametros.push(...(filtros.status === 'aberto' ? ['aberto', 'em_andamento'] : ['fechado', 'resolvido']));
    }
    parametros.push(filtros.limite + 1, filtros.deslocamento);
    return banco.executar(`
        SELECT a.id_alerta, n.hostname AS servidor, c.tipo AS componente,
               a.titulo, a.descricao, a.nivel, CASE WHEN a.status IN ('resolvido', 'fechado') THEN 'fechado' ELSE 'aberto' END AS status, a.situacao_atendimento, a.valor_capturado,
               DATE_FORMAT(a.dt_hora, '%Y-%m-%d %H:%i:%s') AS data_hora
        FROM alerta a
        JOIN componente_node cn ON cn.id_componente_node = a.fk_componente_node
        JOIN componente c ON c.id_componente = cn.fk_componente
        JOIN node n ON n.id_node = cn.fk_node
        JOIN cluster cl ON cl.id_cluster = n.fk_cluster
        JOIN ambiente_hpc h ON h.id_ambiente_hpc = cl.fk_ambiente_hpc
        JOIN usuario u ON u.fk_empresa = h.fk_empresa
        WHERE ${condicoes.join(' AND ')}
        ORDER BY a.dt_hora DESC, a.id_alerta DESC
        LIMIT ? OFFSET ?
    `, parametros);
}
// Atendimento humano é separado do status técnico e do encerramento pelo Java.
function alterarAtendimento(usuarioId, alertaId, situacao) {
    return banco.executar(`
        UPDATE alerta a
        JOIN componente_node cn ON cn.id_componente_node = a.fk_componente_node
        JOIN node n ON n.id_node = cn.fk_node
        JOIN cluster cl ON cl.id_cluster = n.fk_cluster
        JOIN ambiente_hpc h ON h.id_ambiente_hpc = cl.fk_ambiente_hpc
        JOIN usuario u ON u.fk_empresa = h.fk_empresa
        SET a.situacao_atendimento = ?
        WHERE a.id_alerta = ? AND u.id_usuario = ?
    `, [situacao, alertaId, usuarioId]);
}
module.exports = { listar, alterarAtendimento };
