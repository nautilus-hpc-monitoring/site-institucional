var alertaModel = require("../models/alertaModel");

async function listar(req, res) {
    try {
        if (!Number.isSafeInteger(Number(req.query.idUsuario)) || Number(req.query.idUsuario) <= 0) {
            return res.status(400).json({ erro: "Usu?rio n?o informado ou inv?lido." });
        }
        const servidor = req.query.servidor || "";
        const status = req.query.status || "";
        const statusPermitidos = ["aberto", "em_andamento", "resolvido", "fechado"];

        if (typeof servidor !== "string" || servidor.length > 100) {
            return res.status(400).json({ erro: "Filtros de alertas inválidos." });
        }

        if (typeof status !== "string" || (status !== "" && !statusPermitidos.includes(status))) {
            return res.status(400).json({ erro: "Filtros de alertas inválidos." });
        }

        let paginaInformada = req.query.pagina;
        if (paginaInformada === undefined) {
            paginaInformada = "1";
        }

        // A página deve ser um número inteiro positivo, escrito sem espaços.
        if (typeof paginaInformada !== "string" || !/^[1-9]\d*$/.test(paginaInformada)) {
            return res.status(400).json({ erro: "Filtros de alertas inválidos." });
        }

        const pagina = Number(paginaInformada);
        if (!Number.isSafeInteger(pagina) || pagina > 2000) {
            return res.status(400).json({ erro: "Página inválida. Refine os filtros de busca." });
        }

        const limite = 50;
        const filtros = {
            servidor: servidor.trim(),
            status: status,
            limite: limite,
            deslocamento: (pagina - 1) * limite
        };

        const registros = await alertaModel.listar(Number(req.query.idUsuario), filtros);

        // O model busca um registro extra para saber se existe uma próxima página.
        res.set("Cache-Control", "no-store");
        return res.status(200).json({
            alertas: registros.slice(0, limite),
            pagina: pagina,
            temMais: registros.length > limite && pagina < 2000
        });
    } catch (erro) {
        console.error("Falha ao consultar alertas:", erro.code || erro.name);
        return res.status(503).json({
            erro: "Não foi possível consultar o histórico. Tente novamente."
        });
    }
}

async function alterarAtendimento(req, res) {
    const idUsuario = Number(req.body.idUsuario);
    const idAlerta = Number(req.params.id);
    const situacao = req.body.situacao;
    if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0 || !Number.isSafeInteger(idAlerta) || idAlerta <= 0) {
        return res.status(400).json({ erro: "Usuário ou alerta inválido." });
    }
    if (!["nao_visto", "ciente", "em_analise"].includes(situacao)) {
        return res.status(400).json({ erro: "Escolha Não visto, Ciente ou Em análise." });
    }
    try {
        const resultado = await alertaModel.alterarAtendimento(idUsuario, idAlerta, situacao);
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: "Alerta não encontrado para sua empresa." });
        }
        return res.json({ situacao: situacao });
    } catch (erro) {
        console.error("Falha ao atualizar atendimento:", erro.code || erro.name);
        return res.status(503).json({ erro: "Não foi possível salvar o atendimento. Tente novamente." });
    }
}

module.exports = {
    listar,
    alterarAtendimento
};
