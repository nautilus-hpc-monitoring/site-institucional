var hpcModel = require("../models/hpcModel");
var STATUS_VALIDOS = ["ativo", "inativo", "manut."];

function tratarErro(res, erro) {
    console.log(erro);

    if (erro.code == "ER_DUP_ENTRY") {
        return res.status(409).json({ erro: "Registro duplicado encontrado (ex: hostname já existe)." });
    }

    return res.status(500).json({ erro: erro.sqlMessage || erro.message });
}

// HPC 

function listarHPC(req, res) {
    let fkEmpresa = req.body.empresaServer;

    if (!fkEmpresa) {
        return res.status(400).send("fkEmpresa está undefined!");
    }

    hpcModel.listarHPC(fkEmpresa)
        .then(resultado => res.json(resultado))
        .catch(erro => tratarErro(res, erro));
}

function cadastrarHPC(req, res) {
    let {
        nomeServer: nome,
        statusServer: status,
        enderecoServer: endereco, 
        empresaServer: fkEmpresa
    } = req.body;

    if (!nome) return res.status(400).send("nome está undefined!");
    if (!STATUS_VALIDOS.includes(status)) return res.status(400).send("status inválido!");
    if (!endereco) return res.status(400).send("endereco está undefined!"); 
    if (!fkEmpresa) return res.status(400).send("fkEmpresa está undefined!");

    hpcModel.cadastrarHPC(nome, status, endereco, fkEmpresa)
        .then(resultado => res.json(resultado))
        .catch(erro => tratarErro(res, erro));
}

function editarHPC(req, res) {
    let {
        idHpcServer: idHpc,
        nomeServer: nome,
        statusServer: status,
        enderecoServer: endereco
    } = req.body;

    if (!idHpc) {
        return res.status(400).send("idHpc está undefined!");
    }
    if (!nome) {
        return res.status(400).send("nome está undefined!");
    }
    if (!STATUS_VALIDOS.includes(status)) {
        return res.status(400).send("status inválido!");
    }
    if (!endereco) {
        return res.status(400).send("endereco está undefined!");
    }

    hpcModel.editarHPC(idHpc, nome, status, endereco)
        .then(resultado => {
            if (resultado.affectedRows == 0) {
                return res.status(404).json({ erro: "HPC não encontrado." });
            }
            res.json(resultado);
        })
        .catch(erro => tratarErro(res, erro));
}


function deletarHPC(req, res) {
    let idHpc = req.body.idHpcServer;

    if (!idHpc) {
        return res.status(400).send("idHpc está undefined!");
    }

    hpcModel.deletarHPC(idHpc)
        .then(resultado => {
            if (resultado.affectedRows == 0) {
                return res.status(404).json({ erro: "HPC não encontrado para exclusão." });
            }
            res.json(resultado);
        })
        .catch(erro => tratarErro(res, erro));
}

//CLUSTER 
function listarClusters(req, res) {
    let idHpc = req.body.idHpcServer;

    if (!idHpc) {
        return res.status(400).send("idHpc está undefined!");
    }

    hpcModel.listarClusters(idHpc)
        .then(resultado => res.json(resultado))
        .catch(erro => tratarErro(res, erro));
}

function cadastrarCluster(req, res) {
    let {
        idHpcServer: idHpc,
        nomeServer: nome,
        statusServer: status
    } = req.body;

    if (!idHpc) {
        return res.status(400).send("idHpc está undefined!");
    }
    if (!nome) {
        return res.status(400).send("nome está undefined!");
    }
    if (!STATUS_VALIDOS.includes(status)) {
        return res.status(400).send("status inválido!");
    }

    hpcModel.cadastrarCluster(idHpc, nome, status)
        .then(resultado => res.json(resultado))
        .catch(erro => tratarErro(res, erro));
}

function editarCluster(req, res) {
    let {
        idClusterServer: idCluster,
        nomeServer: nome,
        statusServer: status
    } = req.body;

    if (!idCluster) {
        return res.status(400).send("idCluster está undefined!");
    }
    if (!nome) {
        return res.status(400).send("nome está undefined!");
    }
    if (!STATUS_VALIDOS.includes(status)) {
        return res.status(400).send("status inválido!");
    }

    hpcModel.editarCluster(idCluster, nome, status)
        .then(resultado => {
            if (resultado.affectedRows == 0) {
                return res.status(404).json({ erro: "Cluster não encontrado." });
            }
            res.json(resultado);
        })
        .catch(erro => tratarErro(res, erro));
}
function deletarCluster(req, res) {
    let idCluster = req.body.idClusterServer;

    if (!idCluster) {
        return res.status(400).send("idCluster está undefined!");
    }

    hpcModel.deletarCluster(idCluster)
        .then(resultado => {
            if (resultado.affectedRows == 0) {
                return res.status(404).json({ erro: "Cluster não encontrado para exclusão." });
            }
            res.json(resultado);
        })
        .catch(erro => tratarErro(res, erro));
}



//NODE 
function listarNodes(req, res) {
    let idCluster = req.body.idClusterServer;

    if (!idCluster) {
        return res.status(400).send("idCluster está undefined!");
    }

    hpcModel.listarNodes(idCluster)
        .then(resultado => res.json(resultado))
        .catch(erro => tratarErro(res, erro));
}

function buscarNode(req, res) {
    let idNode = req.body.idNodeServer;

    if (!idNode) {
        return res.status(400).send("idNode está undefined!");
    }

    hpcModel.buscarNode(idNode)
        .then(resultado => {
            if (resultado == null) {
                return res.status(404).json({ erro: "Node não encontrado." });
            }
            res.json(resultado);
        })
        .catch(erro => tratarErro(res, erro));
}

function cadastrarNode(req, res) {
    let {
        idClusterServer: idCluster,
        hostnameServer: hostname,
        ipServer: ip,
        sistemaOperacionalServer: sistemaOperacional,
        statusServer: status,
        componentesServer: componentes
    } = req.body;

    if (!idCluster || !hostname || !ip || !sistemaOperacional) {
        return res.status(400).send("Dados do Node incompletos!");
    }
    if (!STATUS_VALIDOS.includes(status)) {
        return res.status(400).send("status inválido!");
    }
    if (!Array.isArray(componentes)) {
        return res.status(400).send("componentes inválido!");
    }

    hpcModel.cadastrarNode(idCluster, hostname, ip, sistemaOperacional, status, componentes)
        .then(resultado => res.json(resultado))
        .catch(erro => tratarErro(res, erro));
}

function editarNode(req, res) {
    let {
        idNodeServer: idNode,
        hostnameServer: hostname,
        ipServer: ip,
        sistemaOperacionalServer: sistemaOperacional,
        statusServer: status,
        componentesServer: componentes
    } = req.body;

    if (!idNode || !hostname || !ip || !sistemaOperacional) {
        return res.status(400).send("Dados do Node incompletos!");
    }
    if (!STATUS_VALIDOS.includes(status)) {
        return res.status(400).send("status inválido!");
    }
    if (!Array.isArray(componentes)) {
        return res.status(400).send("componentes inválido!");
    }

    hpcModel.editarNode(idNode, hostname, ip, sistemaOperacional, status, componentes)
        .then(resultado => {
            if (resultado.affectedRows == 0) {
                return res.status(404).json({ erro: "Node não encontrado." });
            }
            res.json(resultado);
        })
        .catch(erro => tratarErro(res, erro));
}
function deletarNode(req, res) {
    let idNode = req.body.idNodeServer;

    if (!idNode) {
        return res.status(400).send("idNode está undefined!");
    }

    hpcModel.deletarNode(idNode)
        .then(resultado => {
            if (resultado.affectedRows == 0) {
                return res.status(404).json({ erro: "Node não encontrado para exclusão." });
            }
            res.json(resultado);
        })
        .catch(erro => tratarErro(res, erro));
}

module.exports = {
    listarHPC,
    cadastrarHPC,
    editarHPC,
    listarClusters,
    cadastrarCluster,
    editarCluster,
    listarNodes,
    buscarNode,
    cadastrarNode,
    editarNode,
    deletarHPC,
    deletarCluster,
    deletarNode
};