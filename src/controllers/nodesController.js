var nodesModel = require("../models/nodesModel");
const crypto = require("crypto");

function chamarHPC(req, res) {
    var fk_empresa = req.body.fk_empresaServer;

    if (fk_empresa == undefined) {
        res.status(400).send("empresa está undefined!");

    } else {
        nodesModel.chamarHPC(
            fk_empresa
        )

            .then(function (resultado) {

                res.json(resultado);

            })

            .catch(function (erro) {
                res.status(500).json(erro.sqlMessage);
            });


    }
}

function chamarCluster(req, res) {
    var fk_ambiente_hpc = req.body.fk_ambiente_hpcServer;

    if (fk_ambiente_hpc == undefined) {

        res.status(400).send("Ambiente hpc está undefined!");

    } else {
        nodesModel.chamarCluster(
            fk_ambiente_hpc

        )

            .then(function (resultado) {

                res.json(resultado);

            })

            .catch(function (erro) {
                res.status(500).json(erro.sqlMessage);
            });

    }

}

function cadastrar(req, res) {

    var hostname = req.body.hostnameServer;
    var ip = req.body.ipServer;
    var status = req.body.statusServer;
    var sistemaOperacional = req.body.sistemaOperacionalServer;
    var clusterFk = req.body.clusterFkServer;

    if (hostname == undefined) {

        res.status(400).send("Hostname está undefined!");

    } else if (ip == undefined) {

        res.status(400).send("IP está undefined!");

    } else if (status == undefined) {

        res.status(400).send("Status está undefined!");

    } else if (sistemaOperacional == undefined) {

        res.status(400).send("Sistema operacional está undefined!");

    } else if (clusterFk == undefined) {

        res.status(400).send("Cluster está undefined!");

    } else {

        var tokenNode = crypto.randomBytes(32).toString("hex");

        nodesModel.cadastrar(
            hostname,
            ip,
            status,
            sistemaOperacional,
            clusterFk,
            tokenNode
        )
            .then(function (resultado) {

                res.json({
                    resultado: resultado,
                    tokenNode: tokenNode
                });
                
            })

            .catch(function (erro) {
                res.status(500).json(erro.sqlMessage);
            });
    }

}

function ativarAgente(req, res) {
    console.log("Entrou")
    console.log("BODY:", req.body)

    const tokenInstalacao = req.body.tokenInstalacaoServer;
    const hostname = req.body.hostnameServer;

    if (tokenInstalacao == undefined) {
        return res.status(400).send("Token de instalação está undefined");
    }

    if (hostname == undefined) {
        return res.status(400).send("Hostname está undefined");
    }

    nodesModel.ativarAgente(tokenInstalacao, hostname)
        .then(function(resultado) {
            if (resultado.length == 0) {
                return res.status(404).send("Node não encontrado para essa empresa");
            }

            return res.json({
                tokenNode: resultado[0].token_node
            });
        }).catch(function (erro) {
            return res.status(500).json(erro.sqlMessage);
        }) 
}

module.exports = {
    cadastrar,
    chamarHPC,
    chamarCluster,
    ativarAgente
}
