var cduserModel = require("../models/cduserModel");

function cadastrarFuncionario(req,res) {
    console.log("BODY RECEBIDO:");
    console.log(req.body);

    let nomeFuncionario = req.body.nomeServer;
    let emailFuncionario = req.body.emailServer;
    let senhaFuncionario = req.body.senhaServer;
    let nivelAcessoFuncionario = req.body.nivelAcessoServer;
    let fkEmpresa = req.body.empresaServer;

    if (nomeFuncionario == undefined) {

        res.status(400).send("nomeFuncionario  está undefined!");

    } else if (emailFuncionario == undefined) {

        res.status(400).send("emailFuncionario está undefined!");

    } else if (senhaFuncionario == undefined) {

        res.status(400).send("senhaFuncionario está undefined!");

    } else if (nivelAcessoFuncionario == undefined) {

        res.status(400).send("nivelAcessoFuncionario está undefined!");

    } else if (fkEmpresa == undefined) {

        res.status(400).send("fkEmpresa está undefined!");

    } else {
        cduserModel.cadastrarFuncionario(
            nomeFuncionario,
            emailFuncionario,
            senhaFuncionario,
            nivelAcessoFuncionario,
            fkEmpresa
        )
        .then(function(resultado) {
            res.json(resultado);
        })
        .catch(function(erro) {
            res.status(500).json(erro.sqlMessage);
        });
    }
}

module.exports = {
    cadastrarFuncionario
}