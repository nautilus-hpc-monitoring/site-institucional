var dashClusterModel = require("../models/dashClusterModel");
var awsService = require("../services/awsService");
var clusterCalculos = require("../services/clusterCalculos");

// Consulta a empresa do usuário para limitar os clusters que ele pode acessar.
async function buscarClustersDoUsuario(idUsuario) {
    const usuarios = await dashClusterModel.usuario(idUsuario);

    if (usuarios.length === 0) {
        return { idEmpresa: null, clusters: [] };
    }

    const idEmpresa = usuarios[0].fk_empresa;
    const clusters = await dashClusterModel.listar(idEmpresa);

    return {
        idEmpresa: idEmpresa,
        clusters: clusters,
        slaMinutos: Number(usuarios[0].sla_minutos)
    };
}

function formatarDataParaBanco(data) {
    return data.toISOString().slice(0, 19).replace("T", " ");
}

// Preenche o seletor de clusters da dashboard.
async function listar(req, res) {
    try {
        if (
            !Number.isSafeInteger(Number(req.query.idUsuario)) ||
            Number(req.query.idUsuario) <= 0
        ) {
            return res.status(400).json({ erro: "Usuário não informado ou inválido." });
        }
        const resultado = await buscarClustersDoUsuario(Number(req.query.idUsuario));

        res.set("Cache-Control", "no-store");
        return res.status(200).json(resultado.clusters);
    } catch (erro) {
        console.error("Listagem de clusters:", erro.code || erro.name);
        return res.status(503).json({ erro: "Não foi possível consultar os clusters." });
    }
}

// Junta os alertas do banco com a telemetria do S3 para preencher os KPIs e gráficos.
async function dados(req, res) {
    try {
        if (
            !Number.isSafeInteger(Number(req.query.idUsuario)) ||
            Number(req.query.idUsuario) <= 0
        ) {
            return res.status(400).json({ erro: "Usuário não informado ou inválido." });
        }
        const idCluster = Number(req.params.id);
        if (!Number.isSafeInteger(idCluster) || idCluster <= 0) {
            return res.status(400).json({ erro: "Cluster inválido." });
        }

        const usuario = await buscarClustersDoUsuario(Number(req.query.idUsuario));
        const cluster = usuario.clusters.find(function (item) {
            return Number(item.cluster_id) === idCluster;
        });

        if (!cluster) {
            return res
                .status(404)
                .json({ erro: "Cluster não disponível para este usuário." });
        }

        const agora = new Date();
        const inicioDeHoje = clusterCalculos.meiaNoite(agora.getTime());
        const inicioDaConsulta = new Date(inicioDeHoje - 28 * clusterCalculos.DIA);

        const pastaGold = process.env.CLUSTER_GOLD_PREFIX || "03-gold/gestor";
        const prefixo = pastaGold.replace(/\/+$/, "");
        const caminhoArquivo = `${prefixo}/cluster=${idCluster}/dashboard.json`;

        // Consultas independentes carregam ao mesmo tempo.
        const [nodes, alertas, arquivo, limites] = await Promise.all([
            dashClusterModel.nodes(idCluster, usuario.idEmpresa),
            dashClusterModel.alertas(
                idCluster,
                usuario.idEmpresa,
                formatarDataParaBanco(inicioDaConsulta),
                formatarDataParaBanco(agora)
            ),
            awsService.lerJson(caminhoArquivo),
            dashClusterModel.limites(idCluster, usuario.idEmpresa)
        ]);

        const telemetria = clusterCalculos.normalizarGold(
            arquivo.dados,
            nodes,
            idCluster
        );
        const avisos = telemetria.avisos.slice();
        if (arquivo.aviso && !avisos.includes(arquivo.aviso)) {
            avisos.push(arquivo.aviso);
        }

        res.set("Cache-Control", "no-store");
        return res.status(200).json({
            schema_version: 2,
            cluster: cluster,
            nodes: nodes,
            gerado_em: agora.toISOString(),
            alertas: clusterCalculos.calcularAlertas(
                alertas,
                nodes,
                agora,
                usuario.slaMinutos
            ),
            telemetria: telemetria,
            componente: clusterCalculos.componenteMaiorMedia(telemetria.nodes, agora, limites),
            avisos: avisos
        });
    } catch (erro) {
        // Uma falha de consulta não significa que o cluster teve zero incidentes.
        console.error("Dashboard do cluster:", erro.code || erro.name);
        return res
            .status(503)
            .json({ erro: "Não foi possível carregar dados válidos do cluster." });
    }
}

module.exports = {
    listar,
    dados
};
