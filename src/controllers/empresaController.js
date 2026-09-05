const e = require("express");
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

module.exports = {
    cadastrar
}