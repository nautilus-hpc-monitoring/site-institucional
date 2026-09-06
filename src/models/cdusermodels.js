var database = require("../database/config");

function cadastrar(nomeFuncionario,emailFuncionario,senhaFuncionario,NivelAcessoFuncionario) {
    var instrucaoSql = `
    INSERT INTO nivel_acesso (nome) 
    VALUES
    ("${NivelAcessoFuncionario}",)
    `
    
    var instrucaoSql = `
    INSERT INTO usuario (nome,email,senha)
    VALUES
    ("${nomeFuncionario}", "${emailFuncionario}", "${senhaFuncionario}",)
    `

}