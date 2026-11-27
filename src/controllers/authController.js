const authModel = require("../models/authModel");
const bcrypt = require("bcrypt");

function criarErroHttp(status, mensagem) {
    const erro = new Error(mensagem);
    erro.status = status;
    return erro;
}

function validarCredenciaisBasicas(body) {
    const email = String(body?.email || "").trim();
    const senha = String(body?.senha || "");
    const hostname = String(body?.hostname || "").trim();

    if (![email, senha, hostname].every((valor) => typeof valor === "string" && valor.length > 0 && valor.length <= 255)) {
        throw criarErroHttp(400, "Email, senha e hostname são obrigatórios");
    }

    return { email, senha, hostname };
}

function validarHostnames(body) {
    const origem = body?.hostnames;
    if (origem === undefined) return [];
    if (!Array.isArray(origem)) {
        throw criarErroHttp(400, "hostnames deve ser uma lista de textos.");
    }

    const normalizados = origem
        .map((valor) => String(valor || "").trim())
        .filter((valor) => valor.length > 0 && valor.length <= 255);

    if (normalizados.length !== origem.length) {
        throw criarErroHttp(400, "hostnames possui itens inválidos.");
    }

    return [...new Set(normalizados)];
}

function validarChaveInterna(req) {
    const chaveConfigurada = String(process.env.ETL_API_KEY || "blablabla").trim();

    const chaveRecebida = String(
        req.get("x-etl-api-key") || req.body?.etlApiKey || req.query?.etlApiKey || ""
    ).trim();

    if (!chaveRecebida || chaveRecebida !== chaveConfigurada) {
        throw criarErroHttp(401, "Chave interna inválida.");
    }
}

function normalizarNumero(valor) {
    if (valor === null || valor === undefined) return null;
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
}

async function autenticarContexto(body) {
    const { email, senha, hostname } = validarCredenciaisBasicas(body);

    const resultUsuario = await authModel.buscarUsuario(email);
    const usuario = resultUsuario[0];

    if (!usuario) {
        throw criarErroHttp(404, "Email ou senha inválidos");
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
        throw criarErroHttp(401, "Email ou senha inválidos");
    }

    const resultEmpresa = await authModel.buscarEmpresa(usuario.id_empresa);
    const empresa = resultEmpresa[0];
    if (!empresa) {
        throw criarErroHttp(404, "Empresa não encontrada");
    }

    const ambientesHpc = await authModel.buscarAmbienteHpc(empresa.id_empresa);

    const clusters = [];
    for (let i = 0; i < ambientesHpc.length; i++) {
        const resultClusters = await authModel.buscarCluster(ambientesHpc[i].id_ambiente_hpc);
        clusters.push(resultClusters);
    }

    let node;
    for (let i = 0; i < clusters.length; i++) {
        for (let j = 0; j < clusters[i].length; j++) {
            const resultNode = await authModel.buscarNode(hostname, clusters[i][j].id_cluster);
            if (resultNode.length > 0) {
                node = resultNode[0];
            }
        }
    }

    if (!node) {
        throw criarErroHttp(404, "Node não encontrado");
    }

    return { usuario, empresa, node, hostname };
}

async function autenticar(req, res, somenteCredenciais = false) {
    try {
        const { empresa, node } = await autenticarContexto(req.body);

        if (somenteCredenciais) {
            res.set('Cache-Control', 'no-store');
            try {
                const credenciais = await require('../services/awsService').obter();
                return res.status(200).json({ credenciais, region: process.env.AWS_REGION || 'us-east-1' });
            } catch (_) {
                return res.status(503).json({ mensagem: 'Credenciais temporariamente indisponiveis. Tente novamente.' });
            }
        }

        const componentesnode = await authModel.buscarComponenteNode(node.id_node);
        for (let i = 0; i < componentesnode.length; i++) {
            const componente = await authModel.buscarComponente(componentesnode[i].id_componente);
            componentesnode[i]["componente"] = componente[0];
        }

        return res.status(200).json({
            autenticado: true,
            empresa_id: empresa.id_empresa,
            hostname: node.hostname,
            node: node,
            componentesnode: componentesnode
        });

    } catch (erro) {
        if (erro && erro.status) {
            return res.status(erro.status).json({ mensagem: erro.message });
        }
        console.error('Erro na autenticacao.');

        return res.status(500).json({
            mensagem: 'Erro interno do servidor'
        });
    }
}

async function billingParametros(req, res) {
    try {
        validarChaveInterna(req);
        const { empresa } = await autenticarContexto(req.body);
        const hostnames = validarHostnames(req.body);

        const linhas = await authModel.buscarParametrosBilling(empresa.id_empresa, hostnames);
        const parametros = linhas.map((linha) => ({
            id_node: Number(linha.id_node),
            hostname: linha.hostname,
            possui_parametro: linha.id_billing_parametro_node !== null,
            submercado: linha.submercado || null,
            potencia_idle_kw: normalizarNumero(linha.potencia_idle_kw),
            potencia_max_kw: normalizarNumero(linha.potencia_max_kw),
            fator_gamma: normalizarNumero(linha.fator_gamma),
            tarifa_alpha: normalizarNumero(linha.tarifa_alpha),
            tarifa_beta: normalizarNumero(linha.tarifa_beta),
            encargos_kwh: normalizarNumero(linha.encargos_kwh),
            tarifa_fallback_kwh: normalizarNumero(linha.tarifa_fallback_kwh),
            observacao: linha.observacao || null,
            dt_ultima_calibracao: linha.dt_ultima_calibracao || null
        }));

        res.set('Cache-Control', 'no-store');
        return res.status(200).json({
            autenticado: true,
            empresa_id: empresa.id_empresa,
            total_parametros: parametros.length,
            parametros
        });
    } catch (erro) {
        if (erro && erro.status) {
            return res.status(erro.status).json({ mensagem: erro.message });
        }
        console.error('Erro ao buscar parametros de billing.');
        return res.status(500).json({ mensagem: 'Erro interno do servidor' });
    }
}

module.exports = {
    autenticar,
    billingParametros
}
