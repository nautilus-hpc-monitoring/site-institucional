var database = require("../database/config");

function chamarHPC(fk_empresa){
     var instrucaoSql = `  SELECT 
            id,
            nome,
            fk_empresa
        FROM ambiente_hpc
        WHERE fk_empresa = ${fk_empresa};
    `;
    
         return database.executar(instrucaoSql);
}

function chamarCluster(fk_ambiente_hpc){
     var instrucaoSql = ` SELECT
            id,
            nome,
            fk_ambiente_hpc
        FROM cluster
        WHERE fk_ambiente_hpc = ${fk_ambiente_hpc};`;
         return database.executar(instrucaoSql);
}


function cadastrar(hostname, ip, status, sistemaOperacional, clusterFk, tokenNode) {
     var instrucaoSql = `
        INSERT INTO node
        (hostname, ip, status, sistema_operacional, fk_cluster, token_node)
        VALUES
        ('${hostname}', '${ip}', '${status}', '${sistemaOperacional}', ${clusterFk}, '${tokenNode}');
    `;

    return database.executar(instrucaoSql);
}

module.exports = {
    cadastrar,
    chamarHPC,
    chamarCluster
};
