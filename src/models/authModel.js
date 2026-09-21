const database = require("../database/config")

async function buscarUsuario(email) {
    console.log("Entrou em buscar usuario");
    
    const sql = `
        SELECT
            id_usuario,
            nome,
            email_institucional,
            cpf,
            senha,
            verificado,
            fk_nivel_acesso,
            fk_empresa as id_empresa
        FROM usuario
        WHERE email_institucional = '${email}'
    `;
    
    return database.executar(sql);
}

module.exports = {
    buscarUsuario
}