var awsService = require("../services/awsService");
var clusterCalculos = require("../services/clusterCalculos");
var dashClusterModel = require("../models/dashClusterModel");
var dashOperadorModel = require("../models/dashOperadorModel");

var METRICAS = [
    { chave: "cpu", coluna: "CPU" },
    { chave: "ram", coluna: "RAM" },
    { chave: "disco", coluna: "DISCO" }
];

function lerGoldOperador() {
    var prefixo = process.env.OPERADOR_GOLD_PREFIX || "03-gold/operador/";
    return awsService.lerUltimoJson(prefixo.replace(/\/+$/, "") + "/");
}

function formatarDataParaBanco(data) {
    return data.toISOString().slice(0, 19).replace("T", " ");
}

function valorPercentual(valor) {
    if (valor === null || valor === undefined || valor === "") return null;
    var numero = Number(valor);
    return Number.isFinite(numero) && numero >= 0 && numero <= 100 ? numero : null;
}

function situacaoTelemetria(status) {
    return ["atencao", "critico", "alerta", "ruim"].includes(String(status || "").toLowerCase())
        ? "atencao"
        : "normal";
}

function vazio(chave, hostname) {
    return {
        chave: chave,
        hostname: hostname || null,
        valor: null,
        status: "normal",
        hpcId: null,
        clusterId: null,
        nodeId: null
    };
}

function campeaoDeTelemetria(gold, metrica, porHostname) {
    var nodes = gold && Array.isArray(gold.nodes) ? gold.nodes : [];
    var vencedor = vazio(metrica.chave);

    for (var node of nodes) {
        var cadastrado = porHostname.get(node.hostname);
        if (!cadastrado) continue;

        var leitura = node.kpis ? node.kpis[metrica.coluna] : null;
        if (!leitura || leitura.status === "sem_dados") continue;

        var valor = valorPercentual(leitura.valor);
        if (valor === null) continue;

        if (vencedor.valor === null || valor > vencedor.valor) {
            vencedor = {
                chave: metrica.chave,
                hostname: node.hostname,
                valor: valor,
                status: situacaoTelemetria(leitura.status),
                hpcId: cadastrado.id_ambiente_hpc,
                clusterId: cadastrado.id_cluster,
                nodeId: cadastrado.id_node
            };
        }
    }

    return vencedor;
}

function campeaoDeAlertas(alertas, porHostname) {
    var vencedor = {
        chave: "alertas",
        hostname: null,
        valor: 0,
        status: "normal",
        hpcId: null,
        clusterId: null,
        nodeId: null
    };

    for (var alerta of alertas) {
        var cadastrado = porHostname.get(alerta.hostname);
        var quantidade = Number(alerta.quantidade);
        if (!cadastrado || !Number.isFinite(quantidade) || quantidade <= vencedor.valor) continue;

        vencedor = {
            chave: "alertas",
            hostname: alerta.hostname,
            valor: quantidade,
            status: "atencao",
            hpcId: cadastrado.id_ambiente_hpc,
            clusterId: cadastrado.id_cluster,
            nodeId: cadastrado.id_node
        };
    }

    return vencedor;
}

// KPIs da tela inicial: telemetria da Gold do operador + alertas da semana no banco.
async function campeoes(req, res) {
    try {
        if (
            !Number.isSafeInteger(Number(req.query.idUsuario)) ||
            Number(req.query.idUsuario) <= 0
        ) {
            return res.status(400).json({ erro: "Usuário não informado ou inválido." });
        }

        var usuarios = await dashClusterModel.usuario(Number(req.query.idUsuario));
        if (usuarios.length === 0 || !usuarios[0].fk_empresa) {
            return res.status(404).json({ erro: "Usuário ou empresa não encontrados." });
        }

        var idEmpresa = usuarios[0].fk_empresa;
        var agora = new Date();
        var inicioDaSemana = new Date(clusterCalculos.inicioDaSemana(agora.getTime()));

        var [arquivo, nodes, alertas] = await Promise.all([
            lerGoldOperador(),
            dashOperadorModel.nodesDaEmpresa(idEmpresa),
            dashOperadorModel.alertasDaSemana(
                idEmpresa,
                formatarDataParaBanco(inicioDaSemana),
                formatarDataParaBanco(agora)
            )
        ]);

        var porHostname = new Map();
        for (var node of nodes) {
            porHostname.set(node.hostname, {
                id_ambiente_hpc: Number(node.id_ambiente_hpc),
                id_cluster: Number(node.id_cluster),
                id_node: Number(node.id_node)
            });
        }

        var campeoesEncontrados = { alertas: campeaoDeAlertas(alertas, porHostname) };
        for (var metrica of METRICAS) {
            campeoesEncontrados[metrica.chave] = campeaoDeTelemetria(
                arquivo.dados,
                metrica,
                porHostname
            );
        }

        var avisos = [];
        if (arquivo.aviso) avisos.push(arquivo.aviso);
        if (porHostname.size === 0) avisos.push("Nenhum node cadastrado para a empresa.");

        res.set("Cache-Control", "no-store");
        return res.status(200).json({
            campeoes: campeoesEncontrados,
            gerado_em: arquivo.dados && arquivo.dados.metadados
                ? arquivo.dados.metadados.gerado_em_utc || null
                : null,
            chave_s3: arquivo.chave || null,
            avisos: avisos
        });
    } catch (erro) {
        console.error("Campeões do operador:", erro.code || erro.name);
        return res.status(503).json({ erro: "Não foi possível carregar os campeões do operador." });
    }
}

async function detalhe(req, res) {
    var idUsuario = Number(req.query.idUsuario);
    var idNode = Number(req.params.id);
    if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0 ||
        !Number.isSafeInteger(idNode) || idNode <= 0) {
        return res.status(400).json({ erro: "Usuário ou node inválido." });
    }

    try {
        var [usuario] = await dashClusterModel.usuario(idUsuario);
        if (!usuario || !usuario.fk_empresa) {
            return res.status(404).json({ erro: "Usuário ou empresa não encontrados." });
        }

        var idEmpresa = usuario.fk_empresa;
        var cadastrados = await dashOperadorModel.nodesDaEmpresa(idEmpresa);
        var cadastro = cadastrados.find(node => Number(node.id_node) === idNode);
        if (!cadastro) {
            return res.status(404).json({ erro: "Node não disponível para este usuário." });
        }

        var agora = new Date();
        var inicioDaSemana = new Date(clusterCalculos.inicioDaSemana(agora.getTime()));
        var [arquivo, limitesDoCluster, alertasDaEmpresa] = await Promise.all([
            lerGoldOperador(),
            dashClusterModel.limites(cadastro.id_cluster, idEmpresa),
            dashOperadorModel.alertasDaSemana(
                idEmpresa, formatarDataParaBanco(inicioDaSemana), formatarDataParaBanco(agora)
            )
        ]);

        var gold = arquivo.dados;
        var metadados = gold?.metadados;
        var pertenceAEmpresa = !metadados?.empresa_id || Number(metadados.empresa_id) === Number(idEmpresa);
        var nodeGold = pertenceAEmpresa && Array.isArray(gold?.nodes) && !metadados?.demonstrativo
            ? gold.nodes.find(node => node && node.hostname === cadastro.hostname &&
                (!Number(node.cluster_id) || Number(node.cluster_id) === Number(cadastro.id_cluster)))
            : null;
        var telemetria = nodeGold?.telemetria_24h || null;
        var resumo = nodeGold?.medias_semana;
        var legado = nodeGold && !telemetria ? {
            fim: resumo?.fim,
            medias: resumo?.valores,
            consumo: nodeGold.consumo,
        } : null;
        var limitePorComponente = {};
        for (var limite of limitesDoCluster) {
            if (limite.hostname === cadastro.hostname) {
                var componente = String(limite.componente || "").trim().toUpperCase();
                limitePorComponente[componente] = {
                    atencao: limite.limite_atencao,
                    critico: limite.limite_critico,
                };
            }
        }

        var alertas = alertasDaEmpresa.find(item => item.hostname === cadastro.hostname);
        var avisos = [];
        if (arquivo.aviso) avisos.push(arquivo.aviso);
        if (legado) avisos.push("A série de 24 horas estará disponível após a atualização da ETL do operador.");
        if (!nodeGold && !arquivo.aviso) avisos.push("Nenhuma telemetria do operador publicada para este node.");

        res.set("Cache-Control", "no-store");
        return res.status(200).json({
            telemetria: telemetria,
            legado: legado,
            limites: limitePorComponente,
            quantidade_alertas: Number(alertas?.quantidade) || 0,
            avisos: avisos,
        });
    } catch (erro) {
        console.error("Detalhe do operador:", erro.code || erro.name);
        return res.status(503).json({ erro: "Não foi possível carregar a telemetria do node." });
    }
}

module.exports = { campeoes, detalhe };
