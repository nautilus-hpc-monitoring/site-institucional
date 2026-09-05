var database = require("../database/config")

// Coloque os mesmos parâmetros aqui. Vá para a var instrucaoSql
async function cadastrar(razaoSocial, cnpj, dataRegistro, numero, cidade, estado, logradouro) {
    console.log("ACESSEI O EMPRESA MODEL \n \n\t\t >> Se aqui der erro de 'Error: connect ECONNREFUSED',\n \t\t >> verifique suas credenciais de acesso ao banco\n \t\t >> e se o servidor de seu BD está rodando corretamente. \n\n function cadastrar():", razaoSocial, cnpj, dataRegistro);
    
    // Insira exatamente a query do banco aqui, lembrando da nomenclatura exata nos valores
    //  e na ordem de inserção dos dados.
    var instrucaoSql = `
        INSERT INTO empresa (razao_social, cnpj, dt_registro) VALUES ('${razaoSocial}', '${cnpj}', '${dataRegistro}');
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    var resultado = await database.executar(instrucaoSql);
    var idEmpresa = resultado.insertId;

    var instrucaoSql = `
        INSERT INTO endereco (numero, cidade, estado, logradouro, fk_empresa) VALUES ('${numero}', '${cidade}', '${estado}', '${logradouro}', '${idEmpresa}');
    `;
    await database.executar(instrucaoSql);
    return
}

module.exports = {

    cadastrar
};