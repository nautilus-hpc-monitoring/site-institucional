var database = require("../database/config");

async function cadastrarFuncionario(nomeFuncionario, emailFuncionario, senhaFuncionario, NivelAcessoFuncionario, fkEmpresa) {
    var buscarNivel = `SELECT id_nivel_acesso FROM nivel_acesso WHERE nome = "${NivelAcessoFuncionario}"`;
    var nivel = await database.executar(buscarNivel);
    var nivelAcessoId = nivel[0].id_nivel_acesso;

    var instrucaoSql = `
        INSERT INTO usuario (nome, email, senha, nivel_acesso_fk, empresa_fk)
        VALUES
        ("${nomeFuncionario}", "${emailFuncionario}", "${senhaFuncionario}", "${nivelAcessoId}", "${fkEmpresa}")
    `;
    return database.executar(instrucaoSql);
}

module.exports = {
    cadastrarFuncionario
}