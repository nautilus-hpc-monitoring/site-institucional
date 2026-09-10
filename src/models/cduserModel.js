var database = require("../database/config");

async function cadastrarFuncionario(
    nomeFuncionario,
    emailFuncionario,
    senhaFuncionario,
    NivelAcessoFuncionario,
    fkEmpresa
) {

    var buscarNivel = `
        SELECT id 
        FROM nivel_acesso 
        WHERE nome = "${NivelAcessoFuncionario}"
    `;

    var nivel = await database.executar(buscarNivel);

    console.log("Nível enviado:", NivelAcessoFuncionario);
    console.log("Resultado da busca:", nivel);

    if (nivel.length === 0) {
        throw new Error("Nível de acesso não encontrado");
    }

    var nivelAcessoId = nivel[0].id;

    var instrucaoSql = `
        INSERT INTO usuario (
            nome, 
            email, 
            senha, 
            fk_nivel_acesso, 
            fk_empresa
        )
        VALUES (
            "${nomeFuncionario}", 
            "${emailFuncionario}", 
            "${senhaFuncionario}", 
            "${nivelAcessoId}", 
            "${fkEmpresa}"
        )
    `;

    return database.executar(instrucaoSql);
}

module.exports = {
    cadastrarFuncionario
}