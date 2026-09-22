var database = require("../database/config");

function criarToken(token, dt_expiracao, fk_usuario) {

    var instrucaoSql = `

        INSERT INTO verificacao_email (token, dt_expiracao, fk_usuario)
        VALUES ('${token}', '${dt_expiracao}', '${fk_usuario}');

    `;

    console.log("Executando a instrução SQL: \n" + instrucaoSql);

    return database.executar(instrucaoSql);
}


function buscarPorToken(token) {

    var instrucaoSql = `

        SELECT
            id_verificacao,
            token,
            dt_expiracao,
            fk_usuario
        FROM verificacao_email
        WHERE token = '${token}';

    `;

    console.log("Executando a instrução SQL: \n" + instrucaoSql);

    return database.executar(instrucaoSql);
}


function excluirToken(token) {

    var instrucaoSql = `

        DELETE FROM verificacao_email
        WHERE token = '${token}';

    `;

    console.log("Executando a instrução SQL: \n" + instrucaoSql);

    return database.executar(instrucaoSql);
}


module.exports = {

    criarToken,
    buscarPorToken,
    excluirToken

};
