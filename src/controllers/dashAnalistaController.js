// Dashboard do analista: autoriza o usuário e devolve o JSON da Gold apontado
// pela chave S3_KEY.
//
// Fluxo de cada requisição:
//   1. valida ?idUsuario= e :id;
//   2. confirma, no MySQL, que o cluster pertence à empresa do usuário;
//   3. lê a chave S3_KEY do S3 (ou de uma pasta local, quando
//      ANALISTA_GOLD_LOCAL_DIR está definida);
//   4. devolve só o node pedido, mais a lista de nodes para o seletor.
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
// Em produção, o arquivo está no S3 e é lido por awsService.lerJson,
// usando S3_KEY como chave completa (não como pasta).
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

    // Caminho de produção: S3.
    // Aqui S3_KEY é a chave completa do JSON; não acrescentamos /cluster=<id>/.
    var chave = process.env.S3_KEY || "03-gold/dashboard-categorica/dashboard.json";
    return awsService.lerJson(chave);
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

// GET /dashanalista/clusters/3/dados?idUsuario=1&node=node01
// Devolve o bloco de um node do JSON da Gold.
async function dados(req, res) {
    try {
        // 1. Validação dos parâmetros vindos da URL.
        var idUsuario = inteiroPositivo(req.query.idUsuario);
        if (!idUsuario) {
            return res.status(400).json({ erro: "Usuário não informado ou inválido." });
        }

        var idCluster = inteiroPositivo(req.params.id);
        if (!idCluster) {
            return res.status(400).json({ erro: "Cluster inválido." });
        }

        // 2. Autorização: o cluster precisa pertencer à empresa do usuário.
        var resultado = await clustersDoUsuario(idUsuario);
        if (!resultado) {
            return res.status(404).json({ erro: "Usuário não encontrado." });
        }

        // find percorre a lista e devolve o primeiro item que passar no teste.
        var cluster = resultado.clusters.find(function (item) {
            return Number(item.cluster_id) === idCluster;
        });
        if (!cluster) {
            return res.status(404).json({ erro: "Cluster não disponível para este usuário." });
        }

        // 3. Leitura do arquivo publicado pela ETL (S3 ou pasta local).
        var arquivo = await lerPainel(idCluster);
        var painel = arquivo.dados;

        // Avisos explicam à página por que não há dados (BUCKET_NAME, S3, etc.).
        var avisos = [];
        if (arquivo.aviso) {
            avisos.push(arquivo.aviso);
        }
        if (painel && Array.isArray(painel.avisos)) {
            avisos.push.apply(avisos, painel.avisos); // equivalente a avisos.push(...)
        }

        // 4. Lista de nodes e escolha do node pedido.
        var nodes = painel && Array.isArray(painel.nodes) ? painel.nodes : [];
        var nomes = nodes.map(function (node) {
            return node.hostname;
        });

        var pedido = typeof req.query.node === "string" ? req.query.node : "";
        var selecionado = nodes.find(function (node) {
            return node.hostname === pedido;
        }) || nodes[0] || null;

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
            selecionado: selecionado ? selecionado.hostname : null,
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
    dados
};
