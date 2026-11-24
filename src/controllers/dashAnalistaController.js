// Dashboard do analista: autoriza o usuário e devolve o JSON da Gold do cluster.
//
// Fluxo de cada requisição:
//   1. valida ?idUsuario= e :id;
//   2. confirma, no MySQL, que o cluster pertence à empresa do usuário;
//   3. lista os nodes cadastrados no MySQL;
//   4. para um node do cadastro, devolve a telemetria publicada na Gold.
//
// Reaproveitamos o modelo da dashboard de cluster porque as consultas de
// usuário/empresa/clusters são exatamente as mesmas. Assim não duplicamos SQL.
var dashClusterModel = require("../models/dashClusterModel");
var awsService = require("../services/awsService");
var fs = require("fs");
var path = require("path");

// ---------------------------------------------------------------------------
// Leitura do arquivo publicado pela ETL.
//
// No S3, a chave usa ANALISTA_GOLD_PREFIX e o ID do cluster autorizado no banco.
// A ETL publica por padrão em 03-gold/analista/cluster=<id>/dashboard.json.
// Para testar sem AWS, defina ANALISTA_GOLD_LOCAL_DIR apontando para a pasta
// onde a ETL gravou a Gold local (a mesma GOLD_LOCAL_DIR do Python). Exemplo:
//   ANALISTA_GOLD_LOCAL_DIR=C:\temp\gold_teste
// A pasta deve conter "cluster=<id>\dashboard.json".
// ---------------------------------------------------------------------------
async function lerPainel(idCluster) {
    var pastaLocal = process.env.ANALISTA_GOLD_LOCAL_DIR;

    // Modo local: usado só para desenvolvimento/teste, sem credenciais AWS.
    if (pastaLocal) {
        var arquivoLocal = path.join(pastaLocal, "cluster=" + idCluster, "dashboard.json");
        try {
            var conteudo = await fs.promises.readFile(arquivoLocal, "utf8");
            return { dados: JSON.parse(conteudo), aviso: null };
        } catch (erro) {
            // ENOENT = arquivo não existe. Qualquer outro erro é JSON inválido.
            var motivo = erro.code === "ENOENT"
                ? "Arquivo local não encontrado: " + arquivoLocal
                : "Falha ao ler o arquivo local: " + (erro.message || erro.code);
            return { dados: null, aviso: motivo };
        }
    }

    var pastaGold = process.env.ANALISTA_GOLD_PREFIX || "03-gold/analista";
    var prefixo = pastaGold.replace(/\/+$/, "");
    return awsService.lerJson(`${prefixo}/cluster=${idCluster}/dashboard.json`);
}

// Converte o parâmetro recebido em inteiro positivo, ou devolve null.
// Number("abc") vira NaN, e Number.isSafeInteger rejeita NaN e frações.
function inteiroPositivo(valor) {
    var numero = Number(valor);
    return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}

// Busca a empresa do usuário e todos os clusters que ela pode ver.
// Devolve null quando o usuário não existe.
async function clustersDoUsuario(idUsuario) {
    var usuarios = await dashClusterModel.usuario(idUsuario);
    if (usuarios.length === 0) {
        return null;
    }
    var idEmpresa = usuarios[0].fk_empresa;
    return {
        idEmpresa: idEmpresa,
        clusters: await dashClusterModel.listar(idEmpresa)
    };
}

// GET /dashanalista/clusters?idUsuario=1
// Preenche o seletor de cluster da página.
async function listar(req, res) {
    try {
        var idUsuario = inteiroPositivo(req.query.idUsuario);
        if (!idUsuario) {
            return res.status(400).json({ erro: "Usuário não informado ou inválido." });
        }

        var resultado = await clustersDoUsuario(idUsuario);

        // Cache-Control no-store evita que o navegador mostre lista antiga.
        res.set("Cache-Control", "no-store");
        return res.status(200).json(resultado ? resultado.clusters : []);
    } catch (erro) {
        console.error("Analista - listagem de clusters:", erro.code || erro.name);
        return res.status(503).json({ erro: "Não foi possível consultar os clusters." });
    }
}

async function autorizarCluster(req, res) {
    var idUsuario = inteiroPositivo(req.query.idUsuario);
    if (!idUsuario) {
        res.status(400).json({ erro: "Usuário não informado ou inválido." });
        return null;
    }

    var idCluster = inteiroPositivo(req.params.id);
    if (!idCluster) {
        res.status(400).json({ erro: "Cluster inválido." });
        return null;
    }

    var resultado = await clustersDoUsuario(idUsuario);
    if (!resultado) {
        res.status(404).json({ erro: "Usuário não encontrado." });
        return null;
    }

    var cluster = resultado.clusters.find(function (item) {
        return Number(item.cluster_id) === idCluster;
    });
    if (!cluster) {
        res.status(404).json({ erro: "Cluster não disponível para este usuário." });
        return null;
    }

    return { idCluster: idCluster, idEmpresa: resultado.idEmpresa, cluster: cluster };
}

// GET /dashanalista/clusters/3/nodes?idUsuario=1
async function listarNodes(req, res) {
    try {
        var acesso = await autorizarCluster(req, res);
        if (!acesso) {
            return;
        }

        var cadastro = await dashClusterModel.nodes(acesso.idCluster, acesso.idEmpresa);
        res.set("Cache-Control", "no-store");
        return res.status(200).json(cadastro);
    } catch (erro) {
        console.error("Analista - listagem de nodes:", erro.code || erro.name);
        return res.status(503).json({ erro: "Não foi possível consultar os nodes do cluster." });
    }
}

// GET /dashanalista/clusters/3/dados?idUsuario=1&node=node01
async function dados(req, res) {
    try {
        var acesso = await autorizarCluster(req, res);
        if (!acesso) {
            return;
        }

        var { idCluster, idEmpresa, cluster } = acesso;
        var cadastro = await dashClusterModel.nodes(idCluster, idEmpresa);
        var nomes = cadastro.map(function (node) {
            return node.hostname;
        });
        var pedido = req.query.node || "";
        if (typeof pedido !== "string") {
            return res.status(400).json({ erro: "Node inválido." });
        }
        if (pedido && !nomes.includes(pedido)) {
            return res.status(404).json({ erro: "Node não cadastrado neste cluster." });
        }

        var arquivo = nomes.length ? await lerPainel(idCluster) : { dados: null };
        var painel = arquivo.dados;

        // Avisos explicam à página por que não há dados (BUCKET_NAME, S3, etc.).
        var avisos = [];
        if (arquivo.aviso) {
            avisos.push(arquivo.aviso);
        }
        if (painel && Array.isArray(painel.avisos)) {
            avisos.push.apply(avisos, painel.avisos); // equivalente a avisos.push(...)
        }

        // 4. Cruza os nodes cadastrados com a telemetria pelo hostname.
        var telemetria = painel && Array.isArray(painel.nodes) ? painel.nodes : [];
        var porHostname = new Map();
        for (var node of telemetria) {
            if (node && typeof node.hostname === "string") {
                porHostname.set(node.hostname, node);
            }
        }
        var escolhido = pedido || nomes.find(function (nome) {
            return porHostname.has(nome);
        }) || nomes[0] || null;
        var selecionado = porHostname.get(escolhido) || null;

        if (nomes.length === 0) {
            avisos.unshift("Nenhum node cadastrado para este cluster.");
        } else if (!selecionado && !arquivo.aviso) {
            avisos.unshift("Sem telemetria publicada para o node " + escolhido + ".");
        }

        res.set("Cache-Control", "no-store");

        // Resposta no formato que public/js/dashboard-analista.js espera.
        return res.status(200).json({
            schema_version: painel && painel.schema_version ? painel.schema_version : 1,
            cluster: {
                cluster_id: cluster.cluster_id,
                cluster_nome: cluster.cluster_nome,
                hpc_nome: cluster.hpc_nome,
                total_nodes: cluster.total_nodes
            },
            nodes: nomes,
            selecionado: escolhido,
            metadados: painel ? painel.metadados : null,
            node: selecionado,
            avisos: avisos
        });
    } catch (erro) {
        console.error("Analista - dados do cluster:", erro.code || erro.name);
        return res.status(503).json({ erro: "Não foi possível carregar a análise histórica." });
    }
}

module.exports = {
    listar,
    listarNodes,
    dados
};
