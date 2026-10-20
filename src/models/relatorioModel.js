var database = require("../database/config")

function buscarRelatorio(nome) {

    var instrucaoSql = `
        SELECT *
        FROM relatorio
        WHERE titulo = '${nome}'
    `;

    return database.executar(instrucaoSql);
}

module.exports = {
    buscarRelatorio
}