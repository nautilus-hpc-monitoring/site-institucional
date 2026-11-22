const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.BUCKET_NAME;
const KEY = process.env.S3_KEY;
const TTL_MS = 30_000;

let cache = { dados: null, etag: null, expiraEm: 0 };

async function carregarJson() {
    const agora = Date.now();
    if (cache.dados && agora < cache.expiraEm) return cache.dados;

    try {
        const resp = await s3.send(new GetObjectCommand({
            Bucket: BUCKET,
            Key: KEY,
            IfNoneMatch: cache.etag || undefined,
        }));
        const texto = await resp.Body.transformToString();
        cache = { dados: JSON.parse(texto), etag: resp.ETag, expiraEm: agora + TTL_MS };
    } catch (erro) {
        if (erro.$metadata?.httpStatusCode === 304 && cache.dados) {
            cache.expiraEm = agora + TTL_MS;
        } else {
            throw erro;
        }
    }
    return cache.dados;
}

async function buscarPorHostnames(hostnames) {
    const todos = await carregarJson();
    const permitidos = new Set(hostnames);

    const episodios = (todos.episodios || []).filter((e) => permitidos.has(e.hostname));

    return {
        schema_version: todos.schema_version,
        metadados: {
            ...todos.metadados,
            total_episodios_historicos: episodios.length,
            total_nodes: new Set(episodios.map((e) => e.hostname)).size,
        },
        ...agregar(episodios),
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

function agregar(episodios) {
    const categorias = contar(episodios, (e) => e.categoria.nome);
    const nodes = contar(episodios, (e) => e.hostname)
        .map(({ nome, quantidade_episodios }) => ({ hostname: nome, quantidade_episodios }));

    const porCategoria = {};
    for (const e of episodios) {
        if (e.score == null) continue;
        (porCategoria[e.categoria.nome] ||= []).push(Number(e.score));
    }
    const scores = Object.entries(porCategoria)
        .map(([nome, v]) => ({
            nome,
            score_max: Math.max(...v),
            score_medio: v.reduce((a, b) => a + b, 0) / v.length,
        }))
        .sort((a, b) => b.score_max - a.score_max || a.nome.localeCompare(b.nome));

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