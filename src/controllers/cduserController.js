var cduserModel = require("../models/cdusermodels");

function cadastrarFuncionario(req,res) {
    let nomeFuncionario = req.body.nomeServer;
    let emailFuncionario = req.body.emailServer;
    let senhaFuncionario = req.body.senhaServer;
    let NivelAcessoFuncionario = req.body.NivelAcessoServer;

    if (nomeFuncionario == undefined) {

        res.status(400).send("nomeFuncionario  está undefined!");

    } else if (emailFuncionario == undefined) {

        res.status(400).send("emailFuncionario está undefined!");

    } else if (senhaFuncionario == undefined) {

        res.status(400).send("senhaFuncionario está undefined!");

    } else if (NivelAcessoFuncionario == undefined) {

        res.status(400).send("NivelAcessoFuncionario está undefined!");

    } else {
        cduserModel.cadastrarFuncionario(
            nomeFuncionario,
            emailFuncionario,
            senhaFuncionario,
            NivelAcessoFuncionario
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