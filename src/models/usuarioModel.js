var database = require("../database/config")

function buscarPorEmail(email) {

    var instrucaoSql = `
        SELECT id_usuario, nome, email_institucional, senha, verificado, fk_empresa, fk_nivel_acesso
        FROM usuario
        WHERE email_institucional = '${email}'
    `;

    return database.executar(instrucaoSql);
}

function autenticar(email, senha) {
    console.log("ACESSEI O USUARIO MODEL \n \n\t\t >> Se aqui der erro de 'Error: connect ECONNREFUSED',\n \t\t >> verifique suas credenciais de acesso ao banco\n \t\t >> e se o servidor de seu BD está rodando corretamente. \n\n function entrar(): ", email, senha)
    var instrucaoSql = `
        SELECT id_usuario, nome, email_institucional, fk_empresa, fk_nivel_acesso FROM usuario WHERE email_institucional = '${email}' AND senha = '${senha}';
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

// Coloque os mesmos parâmetros aqui. Vá para a var instrucaoSql
function cadastrar(nome, email, senha, cpf, fk_nivel_acesso) {
    console.log("ACESSEI O USUARIO MODEL \n \n\t\t >> Se aqui der erro de 'Error: connect ECONNREFUSED',\n \t\t >> verifique suas credenciais de acesso ao banco\n \t\t >> e se o servidor de seu BD está rodando corretamente. \n\n function cadastrar():", nome, email, senha);
    
    // Insira exatamente a query do banco aqui, lembrando da nomenclatura exata nos valores
    //  e na ordem de inserção dos dados.
    var instrucaoSql = `
        INSERT INTO usuario (nome, email_institucional, senha, cpf, fk_nivel_acesso) VALUES ('${nome}', '${email}', '${senha}', '${cpf}', ${fk_nivel_acesso});
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function verificarEmail(id_usuario) {

    var instrucaoSql = `UPDATE usuario
         SET verificado = 1
         WHERE id_usuario = ${id_usuario}
         `

    return database.executar(instrucaoSql)
}

module.exports = {
    autenticar,
    cadastrar,
    verificarEmail,
    buscarPorEmail
};