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
    const tokenInstalacao = req.body.tokenInstalacaoServer;
    const hostname = req.body.hostnameServer;
    const enderecoMac = req.body.enderecoMacServer;

    if (tokenInstalacao == undefined) {
        return res.status(400).send(
            "Token de instalação está undefined"
        );
    }

    if (hostname == undefined) {
        return res.status(400).send(
            "Hostname está undefined"
        );
    }

    if (enderecoMac == undefined) {
        return res.status(400).send(
            "Endereço MAC está undefined"
        );
    }

    nodesModel.ativarAgente(tokenInstalacao, hostname)
        .then(function (resultado) {

            if (resultado.length == 0) {
                return res.status(404).send(
                    "Node não encontrado para essa empresa"
                );
            }

            if (resultado.length > 1) {
                return res.status(409).send(
                    "Existe mais de um node com esse hostname"
                );
            }

            const node = resultado[0];

            if (node.endereco_mac == null) {

                nodesModel.salvarMac(
                    node.id,
                    enderecoMac
                )
                    .then(function () {

                        return res.json({
                            mensagem: "Agente ativado com sucesso",
                            tokenNode: node.token_node
                        });

                    })
                    .catch(function (erro) {
                        return res.status(500).json(
                            erro.sqlMessage
                        );
                    });

            } else if (
                node.endereco_mac.toUpperCase() ===
                enderecoMac.toUpperCase()
            ) {

                return res.json({
                    mensagem: "Agente já estava ativado nesta máquina",
                    tokenNode: node.token_node
                });

            } else {

                return res.status(409).send(
                    "Este node já está vinculado a outra máquina"
                );
            }

        })
        .catch(function (erro) {
            return res.status(500).json(
                erro.sqlMessage
            );
        });
}

module.exports = {
    cadastrar,
    chamarHPC,
    chamarCluster,
    ativarAgente
}
