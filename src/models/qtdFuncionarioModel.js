var database = require("../database/config");

function buscarQuantidades(fkEmpresa) {
    
    var instrucaoSql = `
        SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN na.nome = 'admin' THEN 1 ELSE 0 END) AS administradores,
            SUM(CASE WHEN na.nome = 'gestores' THEN 1 ELSE 0 END) AS gestores,
            SUM(CASE WHEN na.nome = 'operadores' THEN 1 ELSE 0 END) AS operadores
        FROM usuario u
        JOIN nivel_acesso na ON u.fk_nivel_acesso = na.id
        WHERE u.fk_empresa = ${fkEmpresa}
    `
    return database.executar(instrucaoSql)
    
}

module.exports = {
    buscarQuantidades
}