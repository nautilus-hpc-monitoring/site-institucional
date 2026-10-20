var qtdFuncionarioModel = require("../models/qtdFuncionarioModel");

function buscarRelatorio(req, res) {
    let nome_relatorio = req.query.nome;
    
    if (relatorio == undefined) {
        res.status(400).send("Relatório está undefined!");
    } else {
        relatorioModel.buscarRelatorio(nome_relatorio)
        .then(function(resultado) {
            res.json(resultado);
            
        })
        .catch(function(erro) {
            res.status(500).json(erro.sqlMessage);
        });
    }
}

module.exports = {
    buscarRelatorio
}