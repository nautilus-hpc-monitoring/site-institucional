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
        WHERE email_institucional = ?
    `;

    return database.executar(sql, [email]);
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
        WHERE id_empresa = ?
    `;

    return database.executar(sql, [id_empresa]);
}

async function buscarAmbienteHpc(id_empresa) {
    console.log("Entrou em buscar ambiente HPC");
    
    const sql = `
        SELECT
            id_ambiente_hpc,
            nome,
            status,
            fk_empresa as id_empresa
        FROM ambiente_hpc
        WHERE fk_empresa = ?
    `;

    return database.executar(sql, [id_empresa]);
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
        WHERE fk_ambiente_hpc = ?
    `;

    return database.executar(sql, [id_ambiente_hpc]);
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
        WHERE fk_cluster = ? AND hostname = ?;
    `;

    return database.executar(sql, [id_cluster, hostname]);
}

async function buscarComponenteNode(id_node) {
    console.log("Entrou em buscar componente_node");
    
    const sql = `
        SELECT
            id_componente_node,
            fk_componente as id_componente,
            fk_node as id_node
        FROM componente_node
        WHERE fk_node = ?;
    `;

    return database.executar(sql, [id_node]);
}

async function buscarComponente(id_componente) {
    console.log("Entrou em buscar componente");
    
    const sql = `
        SELECT
            id_componente,
            tipo,
            fabricante,
            modelo,
            unidade_medida
        FROM componente
        WHERE id_componente = ?;
    `;

    return database.executar(sql, [id_componente]);
}

async function buscarParametrosBilling(empresaId, hostnames = []) {
    console.log("Entrou em buscar parametros billing");

    const filtros = ["h.fk_empresa = ?"];
    const parametros = [empresaId];

    if (Array.isArray(hostnames) && hostnames.length > 0) {
        const lista = hostnames
            .map((hostname) => String(hostname || "").trim())
            .filter((hostname) => hostname.length > 0);

        if (lista.length > 0) {
            filtros.push(`n.hostname IN (${lista.map(() => "?").join(", ")})`);
            parametros.push(...lista);
        }
    }

    const sql = `
        SELECT
            n.id_node,
            n.hostname,
            b.id_billing_parametro_node,
            b.potencia_idle_kw,
            b.potencia_max_kw,
            b.fator_gamma,
            b.tarifa_alpha,
            b.tarifa_beta,
            b.encargos_kwh,
            b.tarifa_fallback_kwh,
            b.submercado,
            b.dt_ultima_calibracao,
            b.observacao
        FROM ambiente_hpc h
        JOIN cluster c
            ON c.fk_ambiente_hpc = h.id_ambiente_hpc
        JOIN node n
            ON n.fk_cluster = c.id_cluster
        LEFT JOIN billing_parametro_node b
            ON b.fk_node = n.id_node
        WHERE ${filtros.join(" AND ")}
        ORDER BY n.hostname
    `;

    return database.executar(sql, parametros);
}

module.exports = {
    buscarUsuario,
    buscarEmpresa,
    buscarAmbienteHpc,
    buscarCluster,
    buscarNode,
    buscarComponenteNode,
    buscarComponente,
    buscarParametrosBilling
}
