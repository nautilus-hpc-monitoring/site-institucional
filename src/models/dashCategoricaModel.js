const banco = require("../database/config");

function buscarNodes(id_usuario) {
    return banco.executar(
        `SELECT 
	n.hostname
FROM ambiente_hpc AS a 
JOIN cluster AS c
ON c.fk_ambiente_hpc = a.id_ambiente_hpc
JOIN node AS n 
ON n.fk_cluster = c.id_cluster
WHERE a.fk_empresa IN (
	SELECT fk_empresa FROM usuario WHERE id_usuario = ?)`,
        [id_usuario]
    );
}

function buscarFiltros(id_usuario) {
    return banco.executar(
        `SELECT DISTINCT
	a.id_ambiente_hpc,
	a.nome AS nome_hpc,
	c.id_cluster,
	c.nome AS nome_cluster
FROM ambiente_hpc AS a 
JOIN cluster AS c
ON c.fk_ambiente_hpc = a.id_ambiente_hpc
JOIN node AS n 
ON n.fk_cluster = c.id_cluster
WHERE a.fk_empresa IN (
	SELECT fk_empresa FROM usuario WHERE id_usuario = ?)`,
        [id_usuario]
    );
}

function buscarPorHpc(id_hpc, id_usuario) {    
    return banco.executar(
        `SELECT n.hostname
FROM ambiente_hpc AS a
JOIN cluster AS c ON c.fk_ambiente_hpc = a.id_ambiente_hpc
JOIN node AS n ON n.fk_cluster = c.id_cluster
WHERE a.id_ambiente_hpc = ?
  AND a.fk_empresa = (SELECT fk_empresa FROM usuario WHERE id_usuario = ?)`,
        [id_hpc, id_usuario]
    );
}

function buscarPorCluster(id_cluster, id_usuario) {
    return banco.executar(
        `SELECT n.hostname
FROM ambiente_hpc AS a
JOIN cluster AS c ON c.fk_ambiente_hpc = a.id_ambiente_hpc
JOIN node AS n ON n.fk_cluster = c.id_cluster
WHERE c.id_cluster = ?
  AND a.fk_empresa = (SELECT fk_empresa FROM usuario WHERE id_usuario = ?)`,
        [id_cluster, id_usuario]
    );
}

module.exports = {
    buscarNodes,
    buscarPorCluster,
    buscarPorHpc,
    buscarFiltros
};
