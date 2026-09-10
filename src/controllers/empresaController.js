const e = require("express");
const path = require("path");
const { ZipArchive } = require("archiver");
var empresaModel = require("../models/empresaModel");


function cadastrar(req, res) {

    var razaoSocial = req.body.razaoSocialServer;
    var cnpj = req.body.cnpjServer;
    var dataRegistro = req.body.dataRegistroServer;
    var logradouro = req.body.logradouroServer;
    var numero = req.body.numeroServer;
    var cidade = req.body.cidadeServer;
    var estado = req.body.estadoServer;

    // Faça as validações dos valores
    if (razaoSocial == undefined) {
        res.status(400).send("Sua razão Social está undefined!");
    } else if (cnpj == undefined) {
        res.status(400).send("Seu cnpj está undefined!");
    } else if (dataRegistro == undefined) {
        res.status(400).send("Sua data de registro está undefined!");
    } else if (logradouro == undefined) {
        res.status(400).send("Seu logradouro está undefined!");
    } else if (numero == undefined) {
        res.status(400).send("Seu número está undefined!");
    } else if (cidade == undefined) {
        res.status(400).send("Sua cidade está undefined!");
    } else if (estado == undefined) {
        res.status(400).send("Seu estado está undefined!");
    } else {

        // Passe os valores como parâmetro e vá para o arquivo empresaModel.js
        empresaModel.cadastrar(razaoSocial, cnpj, dataRegistro, numero, cidade, estado, logradouro)
            .then(
                function (resultado) {
                    res.json(resultado);
                }
            ).catch(
                function (erro) {
                    console.log(erro);
                    console.log(
                        "\nHouve um erro ao realizar o cadastro! Erro: ",
                        erro.sqlMessage
                    );
                    res.status(500).json(erro.sqlMessage);
                }
            );
    }
}

async function baixarAgente(req, res) {
    try {
        const idEmpresa = req.params.idEmpresa;

        const resultado = await empresaModel.buscarTokenInstalacao(idEmpresa);

        if (resultado.length == 0) {
            return res.status(404).json({
                message: "Empresa não encontrada"
            });
        }

        const tokenInstalacao = resultado[0].token_instalacao;

        const config = JSON.stringify({
            token_instalacao: tokenInstalacao
        }, null, 4);

        res.attachment("nautilus-agent.zip");

        const zip = new ZipArchive({
            zlib: {
                level: 9
            }
        });

        zip.pipe(res);

        const caminhoAgente = path.join(__dirname, "../agente");

        // Scripts principais
        zip.file(
            path.join(caminhoAgente, "captura.py"),
            {
                name: "captura.py"
            }
        );

        zip.file(
            path.join(caminhoAgente, "leitura.py"),
            {
                name: "leitura.py"
            }
        );

        zip.file(
            path.join(caminhoAgente, "requirements.txt"),
            {
                name: "requirements.txt"
            }
        );

        // Módulos utilizados pelo agente
        zip.directory(
            path.join(caminhoAgente, "cpu"),
            "cpu"
        );

        zip.directory(
            path.join(caminhoAgente, "disco"),
            "disco"
        );

        zip.directory(
            path.join(caminhoAgente, "ram"),
            "ram"
        );

        zip.directory(
            path.join(caminhoAgente, "swap"),
            "swap"
        );

        zip.directory(
            path.join(caminhoAgente, "utils"),
            "utils"
        );

        // Config personalizado da empresa
        zip.append(config, {
            name: "config.json"
        });

        await zip.finalize();

    } catch (error) {
        console.log(error);

        if (!res.headersSent) {
            res.status(500).json({
                message: "Erro ao gerar agente"
            });
        }
    }
}

module.exports = {
    cadastrar,
    baixarAgente
}
