var mysql = require("mysql2");

// CONEXÃO DO BANCO MYSQL SERVER
var mySqlConfig = {
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
};

function executar(instrucao, parametros = []) {

    if (process.env.AMBIENTE_PROCESSO !== "producao" && process.env.AMBIENTE_PROCESSO !== "desenvolvimento") {
        console.log("\nO AMBIENTE (produção OU desenvolvimento) NÃO FOI DEFINIDO EM .env OU dev.env OU app.js\n");
        return Promise.reject("AMBIENTE NÃO CONFIGURADO EM .env");
    }

    return new Promise(function (resolve, reject) {
        var conexao = mysql.createConnection(mySqlConfig);
        conexao.connect();
        conexao.query(instrucao, parametros, function (erro, resultados) {
            conexao.end();
            if (erro) {
                return reject(erro);
            }

            resolve(resultados);
        });
        conexao.on('error', function (erro) {
            return ("ERRO NO MySQL SERVER: ", erro.sqlMessage);
        });
    });
}

// Salva todas as etapas juntas. Se alguma falhar, desfaz o cadastro inteiro.
async function executarTransacao(operacao) {
    if (process.env.AMBIENTE_PROCESSO !== "producao" && process.env.AMBIENTE_PROCESSO !== "desenvolvimento") {
        throw new Error("AMBIENTE NÃO CONFIGURADO EM .env");
    }

    var conexao = mysql.createConnection(mySqlConfig).promise();

    try {
        await conexao.beginTransaction();
        var resultado = await operacao(conexao);
        await conexao.commit();
        return resultado;
    } catch (erro) {
        try {
            await conexao.rollback();
        } catch (erroAoDesfazer) {
            console.error("Não foi possível desfazer a transação:", erroAoDesfazer.message);
        }
        throw erro;
    } finally {
        await conexao.end();
    }
}

module.exports = {
    executar,
    executarTransacao
};
