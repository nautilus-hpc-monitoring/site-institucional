var qtdFuncionarioModel = require("../models/qtdFuncionarioModel");

function buscarQuantidades(req, res) {
    let fkEmpresa = req.params.fkEmpresa;
    

    if (fkEmpresa == undefined) {
        res.status(400).send("fkEmpresa está undefined!");
    } else {
        qtdFuncionarioModel.buscarQuantidades(fkEmpresa)
        .then(function(resultado) {
            
            res.json(resultado);
            
        })
        .catch(function(erro) {
            res.status(500).json(erro.sqlMessage);
        });
    }
}

module.exports = {
    buscarQuantidades
}