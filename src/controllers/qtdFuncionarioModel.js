var qtdFuncionarioModel = require("../models/qtdFuncionarioModel");

function buscarQuantidades(req, res) {
    let fkEmpresa = req.params.fkEmpresa;

    if (fkEmpresa == undefined) {
        res.status(400).send("fkEmpresa está undefined!");
    } else {
        qtdFuncionarioModel.buscarQuantidades(fkEmpresa)
        .then(function(resultado) {
            // Se o seu database.executar devolver [rows, fields] em vez de rows direto,
            // troque a linha abaixo para: res.json(resultado[0][0]);
            res.json(resultado[0]);
        })
        .catch(function(erro) {
            res.status(500).json(erro.sqlMessage);
        });
    }
}

module.exports = {
    buscarQuantidades
}