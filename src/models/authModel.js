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

async function buscarEmpresa(id_empresa) {
    console.log("Entrou em buscar empresa");
    
    const sql = `
        SELECT
            id_empresa,
            razao_social,
            cnpj,
            dt_registro,
            dominio
        FROM empresa
        WHERE id_empresa = '${id_empresa}'
    `;

    return database.executar(sql);
}

async function buscarAmbienteHpc(id_empresa) {
    console.log("Entrou em buscar ambiente HPC");
    
    const sql = `
        SELECT
            id_ambiente_hpc,
            nome,
            status,
            fk_empresa as id_empresa,
            fk_localizacao as id_localizacao
        FROM ambiente_hpc
        WHERE fk_empresa = '${id_empresa}'
    `;

    return database.executar(sql);
}

async function buscarCluster(id_ambiente_hpc) {
    console.log("Entrou em buscar cluster");
    
    const sql = `
        SELECT
            id_cluster,
            nome,
            status,
            fk_ambiente_hpc as id_ambiente_hpc
        FROM cluster
        WHERE fk_ambiente_hpc = '${id_ambiente_hpc}'
    `;

    return database.executar(sql);
}

async function buscarNode(hostname, id_cluster) {
    console.log("Entrou em buscar node");
    
    const sql = `
        SELECT
            id_node,
            hostname,
            ip,
            sistema_operacional,
            status,
            fk_cluster as id_cluster
        FROM node
        WHERE fk_cluster = '${id_cluster}' AND hostname = '${hostname}';
    `;

    return database.executar(sql);
}

module.exports = {
    buscarUsuario,
    buscarEmpresa,
    buscarAmbienteHpc,
    buscarCluster,
    buscarNode
}