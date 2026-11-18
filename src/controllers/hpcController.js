var hpcModel = require("../models/hpcModel");
var validarLimitesComponente = require("../../public/js/validar-limites");
var STATUS_VALIDOS = ["ativo", "inativo", "manut."];

function tratarErro(res, erro) {
    console.log(erro);

    if (erro.code == "ER_DUP_ENTRY") {
        return res.status(409).json({ erro: "Registro duplicado encontrado (ex: hostname já existe)." });
    }

    if (erro.code == "ER_NO_REFERENCED_ROW_2") {
        return res.status(400).json({ erro: "O HPC, cluster ou componente selecionado não existe. Atualize a página e tente novamente." });
    }

    if (erro.code == "ER_ROW_IS_REFERENCED_2") {
        return res.status(409).json({ erro: "Este registro possui vínculos e não pode ser excluído." });
    }

    return res.status(erro.status || 500).json({ erro: erro.sqlMessage || erro.message });
}

function componentesValidos(componentes) {
    if (!Array.isArray(componentes)) return false;

    var ids = [];
    for (var componente of componentes) {
        if (!componente) return false;
        var id = Number(componente.idComponente);
        if (!Number.isInteger(id) || id <= 0 || ids.includes(id)) return false;
        ids.push(id);

        var valores = [componente.picoMax, componente.picoMin, componente.percentual,
            componente.limiteAtencao, componente.limiteCritico];
        for (var valor of valores) {
            if (valor !== "" && valor !== null && valor !== undefined && !Number.isFinite(Number(valor))) return false;
        }
    }
    return true;
}

// Confere o tipo pelo cadastro do banco, sem confiar no tipo enviado pela tela.
async function validarLimites(componentes) {
    if (componentes.length === 0) return;
    var cadastrados = await hpcModel.listarComponentes();

    for (var componente of componentes) {
        var cadastro = cadastrados.find(item => Number(item.id) === Number(componente.idComponente));
        var mensagem = cadastro
            ? validarLimitesComponente(componente, cadastro.tipo)
            : "Componente não encontrado. Atualize a página e tente novamente.";
        if (mensagem) {
            var erro = new Error(mensagem);
            erro.status = 400;
            throw erro;
        }
    }
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
function listarComponentes(req, res) {
    hpcModel.listarComponentes()
        .then(resultado => res.json(resultado))
        .catch(erro => tratarErro(res, erro));
}

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
    if (!componentesValidos(componentes)) {
        return res.status(400).json({ erro: "Selecione componentes válidos, sem repetição, e use números nos limites." });
    }

    validarLimites(componentes)
        .then(() => hpcModel.cadastrarNode(idCluster, hostname, ip, sistemaOperacional, status, componentes))
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
    if (!componentesValidos(componentes)) {
        return res.status(400).json({ erro: "Selecione componentes válidos, sem repetição, e use números nos limites." });
    }

    validarLimites(componentes)
        .then(() => hpcModel.editarNode(idNode, hostname, ip, sistemaOperacional, status, componentes))
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
    listarComponentes,
    cadastrarNode,
    editarNode,
    deletarHPC,
    deletarCluster,
    deletarNode
};
