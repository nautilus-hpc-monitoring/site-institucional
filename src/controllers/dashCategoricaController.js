var dashCategoricaModel = require("../models/dashCategoricaModel");
var s3Service = require("../services/dashCategoricaService");

async function buscarNodes(req, res) {
    const id_usuario = Number(req.params.id_usuario);

    try {
        if (
            !Number.isSafeInteger(Number(id_usuario)) ||
            Number(id_usuario) <= 0
        ) {
            return res.status(400).json({ erro: "Usuário não informado ou inválido." });
        }
        const linhas = await dashCategoricaModel.buscarNodes(Number(id_usuario));
        const hostnames = linhas.map((l) => l.hostname);

        const dados = await s3Service.buscarPorHostnames(hostnames);
        return res.status(200).json(dados)

    } catch (erro) {
        console.log(erro);

        return res.status(503).json({
            mensagem: 'Erro ao buscar nodes'
        })
    }
}

async function buscarFiltros(req, res) {
    const id_usuario = Number(req.params.id_usuario);

    try {
        if (
            !Number.isSafeInteger(Number(id_usuario)) ||
            Number(id_usuario) <= 0
        ) {
            return res.status(400).json({ erro: "Usuário não informado ou inválido." });
        }

        const busca = await dashCategoricaModel.buscarFiltros(Number(id_usuario));

        return res.status(200).json(busca);
    } catch (erro) {
        console.error("Listagem de filtros:", erro.code || erro.name);
        return res.status(503).json({ erro: "Não foi possível consultar os filtros." });
    }
}

async function buscarPorHpc(req, res) {
    const id_hpc = Number(req.params.id_hpc);
    const id_usuario = Number(req.params.id_usuario);

    try {
        if (
            !Number.isSafeInteger(Number(id_hpc)) ||
            Number(id_hpc) <= 0
        ) {
            return res.status(400).json({ erro: "HPC não informado ou inválido." });
        }

        const linhas = await dashCategoricaModel.buscarPorHpc(id_hpc, id_usuario);
            
        if (linhas.length === 0) {
            return res.status(404).json({ erro: "HPC não encontrado." });
        }

        const hostnames = linhas.map((l) => l.hostname);

        const dados = await s3Service.buscarPorHostnames(hostnames);
        return res.status(200).json(dados);
    } catch (erro) {
        console.error("Listagem de nodes:", erro.code || erro.name);
        return res.status(503).json({ erro: "Não foi possível buscar os nodes pelo HPC." });
    }
}

async function buscarPorCluster(req, res) {
    const id_cluster = Number(req.params.id_cluster);
    const id_usuario = Number(req.params.id_usuario);

    try {
        if (
            !Number.isSafeInteger(Number(id_cluster)) ||
            Number(id_cluster) <= 0
        ) {
            return res.status(400).json({ erro: "cluster não informado ou inválido." });
        }

        const linhas = await dashCategoricaModel.buscarPorCluster(id_cluster, id_usuario);
        const hostnames = linhas.map((l) => l.hostname);

        const dados = await s3Service.buscarPorHostnames(hostnames);
        return res.status(200).json(dados)
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
