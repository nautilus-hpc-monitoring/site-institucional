const alertaModel = require('../models/alertaModel');
const statusValidos = ['aberto', 'em_andamento', 'resolvido', 'fechado'];

async function listar(req, res) {
    const servidor = req.query.servidor || '';
    const status = req.query.status || '';
    const paginaTexto = req.query.pagina === undefined ? '1' : req.query.pagina;
    if (typeof servidor !== 'string' || servidor.length > 100 ||
        typeof status !== 'string' || (status && !statusValidos.includes(status)) ||
        typeof paginaTexto !== 'string' || !/^[1-9]\d*$/.test(paginaTexto)) {
        return res.status(400).json({ erro: 'Filtros de alertas inválidos.' });
    }
    const pagina = Number(paginaTexto), limite = 50;
    if (!Number.isSafeInteger(pagina) || pagina > 2000) {
        return res.status(400).json({ erro: 'Página inválida. Refine os filtros de busca.' });
    }
    try {
        const registros = await alertaModel.listar(req.usuarioClusterId, {
            servidor: servidor.trim(), status, limite, deslocamento: (pagina - 1) * limite
        });
        return res.set('Cache-Control', 'no-store').json({
            alertas: registros.slice(0, limite), pagina,
            temMais: registros.length > limite && pagina < 2000
        });
    } catch (erro) {
        console.error('Falha ao consultar alertas:', erro.code || erro.name);
        return res.status(503).json({ erro: 'Não foi possível consultar o histórico. Tente novamente.' });
    }
}
module.exports = { listar };
