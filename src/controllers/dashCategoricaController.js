const { log10 } = require("chart.js/helpers");
var dashCategoricaModel = require("../models/dashCategoricaModel");
var s3Service = require("../services/s3Service");

async function buscarNodes(req, res) {
    try {
        if (
            !Number.isSafeInteger(Number(req.query.id_usuario)) ||
            Number(req.query.id_usuario) <= 0
        ) {
            return res.status(400).json({ erro: "Usuário não informado ou inválido." });
        }

        const busca = await dashCategoricaModel.buscarNodes(Number(req.query.id_usuario));
        return res.status(200).json(busca.nodes);

    } catch (erro){
        console.log(erro);
        
        return res.status(500).json({
            mensagem: 'Erro ao buscar nodes'
        })
    }
}

async function buscarFiltros(req, res) {
    try {
        if (
            !Number.isSafeInteger(Number(req.query.id_usuario)) ||
            Number(req.query.id_usuario) <= 0
        ) {
            return res.status(400).json({ erro: "Usuário não informado ou inválido." });
        }

        const busca = await buscarFiltros(Number(req.query.id_usuario));

        res.set("Cache-Control", "no-store");
        return res.status(200).json(busca);
    } catch (erro) {
        console.error("Listagem de filtros:", erro.code || erro.name);
        return res.status(503).json({ erro: "Não foi possível consultar os filtros." });
    }
}

async function buscarPorHpc(req, res) {
    try {
        if (
            !Number.isSafeInteger(Number(req.query.id_hpc)) ||
            Number(req.query.id_hpc) <= 0
        ) {
            return res.status(400).json({ erro: "HPC não informado ou inválido." });
        }

        const busca = await buscarPorHpc(Number(req.query.id_hpc));

        res.set("Cache-Control", "no-store");
        return res.status(200).json(busca);
    } catch (erro) {
        console.error("Listagem de nodes:", erro.code || erro.name);
        return res.status(503).json({ erro: "Não foi possível buscar os nodes pelo HPC." });
    }
}

async function buscarPorCluster(req, res) {
    try {
        if (
            !Number.isSafeInteger(Number(req.query.id_cluster)) ||
            Number(req.query.id_cluster) <= 0
        ) {
            return res.status(400).json({ erro: "cluster não informado ou inválido." });
        }

        const busca = await buscarPorCluster(Number(req.query.id_cluster));

        res.set("Cache-Control", "no-store");
        return res.status(200).json(busca);
    } catch (erro) {
        console.error("Listagem de nodes:", erro.code || erro.name);
        return res.status(503).json({ erro: "Não foi possível buscar os nodes pelo cluster." });
    }
}


module.exports = {
    buscarNodes,
    buscarFiltros,
    buscarPorHpc,
    buscarPorCluster
};
