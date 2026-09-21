const authModel = require("../models/authModel");
const bcrypt = require("bcrypt");

async function autenticar(req, res) {
    try {

        // Validação do usuario
        const { email, senha, hostname } = req.body;

        if (!email || !senha || !hostname) {
            return res.status(400).json({
                mensagem: 'Email, senha e hostname são obrigatórios'
            });
        }

        const resultUsuario = await authModel.buscarUsuario(email);
        const usuario = resultUsuario[0];

        if (!usuario) {
            return res.status(404).json({
                mensagem: 'Usuário não encontrado'
            });
        }

        // const senhaValida = await bcrypt.compare(senha, usuario.senha);
        const senhaValida = true;

        if (!senhaValida) {
            return res.status(401).json({
                mensagem: 'Senha inválida'
            });
        }

        // Fim da validação do usuario

        // Consulta da empresa
        const resultEmpresa = await authModel.buscarEmpresa(usuario.id_empresa);
        const empresa = resultEmpresa[0];

        if (!empresa) {
            return res.status(404).json({
                mensagem: 'Empresa não encontrada'
            });
        }

        // Fim da consulta da empresa

        // Consulta de ambiente HPC
        const ambientesHpc = await authModel.buscarAmbienteHpc(empresa.id_empresa);

        // Fim da consulta de ambiente HPC

        // Consulta dos clusters
        const clusters = [];
        for (let i = 0; i < ambientesHpc.length; i++) {
            const resultClusters = await authModel.buscarCluster(ambientesHpc[i].id_ambiente_hpc);
            clusters.push(resultClusters);
        }

        // Fim da consulta dos clusters

        // Consulta dos nodes
        const nodes = []
        for (let i = 0; i < clusters.length; i++) {
            for (let j = 0; j < clusters[i].length; j++) {
                const resultNodes = await authModel.buscarNode(hostname, clusters[i][j].id_cluster)
                
                if (resultNodes.length > 0) {
                    nodes.push(resultNodes[0]);
                }
            }
        }

        // Fim da consulta dos nodes

        return res.status(200).json({
            autenticado: true,
            usuario: usuario,
            node: nodes[0],
            
        });

    } catch (erro) {

        console.error('Erro na autenticação:', erro);

        return res.status(500).json({
            mensagem: 'Erro interno do servidor'
        });
    }
}

module.exports = {
    autenticar
}