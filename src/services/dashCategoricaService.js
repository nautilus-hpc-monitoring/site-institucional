const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.BUCKET_NAME;
const CHAVE_DASHBOARD = process.env.S3_KEY;
const CHAVE_HISTORICO = "03-gold/categorizacao/historico_episodios.json";
const TTL_MS = 30_000;

const cacheDashboard = { dados: null, etag: null, expiraEm: 0 };
const cacheHistorico = { dados: null, etag: null, expiraEm: 0 };

async function carregarObjeto(chave, cache) {
    const agora = Date.now();
    if (cache.dados && agora < cache.expiraEm) return cache.dados;

    try {
        const resp = await s3.send(new GetObjectCommand({
            Bucket: BUCKET,
            Key: chave,
            IfNoneMatch: cache.etag || undefined,
        }));
        const texto = await resp.Body.transformToString();
        Object.assign(cache, {
            dados: JSON.parse(texto),
            etag: resp.ETag,
            expiraEm: agora + TTL_MS,
        });
    } catch (erro) {
        if (erro.$metadata?.httpStatusCode === 304 && cache.dados) {
            cache.expiraEm = agora + TTL_MS;
        } else {
            throw erro;
        }
    }
    return cache.dados;
}

function carregarJson() {
    return carregarObjeto(CHAVE_DASHBOARD, cacheDashboard);
}

function carregarHistorico() {
    return carregarObjeto(CHAVE_HISTORICO, cacheHistorico);
}

function extrairReferencias(historico) {
    const episodios = Array.isArray(historico)
        ? historico
        : historico?.episodios || [];
    return episodios
        .map((episodio) => Number(episodio.score))
        .filter((score) => Number.isFinite(score));
}

function calcularPontos(score, referencias) {
    if (score === null || score === undefined || score === "") return null;
    const atual = Number(score);
    if (!Number.isFinite(atual) || !referencias.length) return null;

    const superiores = referencias.reduce(
        (total, referencia) => total + (referencia >= atual ? 1 : 0),
        0
    );
    const pontos = Math.round((superiores / referencias.length) * 100);
    return Math.min(100, Math.max(0, pontos));
}

function classificarPontos(pontos) {
    if (pontos === null || !Number.isFinite(Number(pontos))) return null;
    if (pontos <= 49) return "Baixa";
    if (pontos <= 69) return "Moderada";
    if (pontos <= 84) return "Alta";
    return "Crítica";
}

async function buscarPorHostnames(hostnames) {
    const [todos, historico] = await Promise.all([carregarJson(), carregarHistorico()]);
    const referencias = extrairReferencias(historico);
    const permitidos = new Set(hostnames);

    const episodios = (todos.episodios || [])
        .filter((e) => permitidos.has(e.hostname))
        .map((episodio) => {
            const pontos = calcularPontos(episodio.score, referencias);
            return {
                ...episodio,
                pontos_severidade: pontos,
                classificacao_severidade: classificarPontos(pontos),
            };
        });

    return {
        schema_version: todos.schema_version,
        metadados: {
            ...todos.metadados,
            total_episodios_historicos: episodios.length,
            total_nodes: new Set(episodios.map((e) => e.hostname)).size,
            total_scores_referencia: referencias.length,
        },
        ...agregar(episodios, referencias),
        episodios,
    };
}

function contar(lista, chave) {
    const mapa = {};
    for (const item of lista) mapa[chave(item)] = (mapa[chave(item)] || 0) + 1;
    return Object.entries(mapa)
        .map(([nome, quantidade_episodios]) => ({ nome, quantidade_episodios }))
        .sort((a, b) => b.quantidade_episodios - a.quantidade_episodios
                        || a.nome.localeCompare(b.nome));
}

function agregar(episodios, referencias = []) {
    const categorias = contar(episodios, (e) => e.categoria.nome);
    const nodes = contar(episodios, (e) => e.hostname)
        .map(({ nome, quantidade_episodios }) => ({ hostname: nome, quantidade_episodios }));

    const porCategoria = {};
    for (const episodio of episodios) {
        const nome = episodio.categoria.nome;
        const grupo = (porCategoria[nome] ||= { scores: [], pontos: [] });

        if (episodio.score !== null && episodio.score !== undefined) {
            const score = Number(episodio.score);
            if (Number.isFinite(score)) grupo.scores.push(score);
        }

        const pontos = episodio.pontos_severidade ?? calcularPontos(episodio.score, referencias);
        if (pontos !== null) grupo.pontos.push(pontos);
    }

    const scores = Object.entries(porCategoria)
        .map(([nome, { scores: valores, pontos }]) => {
            const pontosMax = pontos.length ? Math.max(...pontos) : null;
            const pontosMedio = pontos.length
                ? Math.round(pontos.reduce((a, b) => a + b, 0) / pontos.length)
                : null;

            return {
                nome,
                score_max: valores.length ? Math.max(...valores) : null,
                score_medio: valores.length
                    ? valores.reduce((a, b) => a + b, 0) / valores.length
                    : null,
                pontos_max: pontosMax,
                pontos_medio: pontosMedio,
                classificacao: classificarPontos(pontosMax),
            };
        })
        .sort((a, b) =>
            (b.pontos_max ?? -Infinity) - (a.pontos_max ?? -Infinity)
            || (b.score_max ?? -Infinity) - (a.score_max ?? -Infinity)
            || a.nome.localeCompare(b.nome)
        );

    const matriz = {};
    for (const e of episodios) {
        const linha = (matriz[e.categoria.nome] ||= {});
        linha[e.hostname] = (linha[e.hostname] || 0) + 1;
    }

    return {
        indicadores: {
            node_mais_problematico: nodes[0] || null,
            categoria_mais_comum: categorias[0] || null,
            categoria_mais_severa: scores[0] || null,
            total_episodios: episodios.length,
        },
        categorias,
        nodes,
        matriz_categoria_node: matriz,
    };
}

module.exports = { buscarPorHostnames };