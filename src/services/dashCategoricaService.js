const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.S3_BUCKET;
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
    if (!hostnames.length) return [];

    const todos = await carregarJson();
    const permitidos = new Set(hostnames);
    return todos.filter((node) => permitidos.has(node.hostname));
}

module.exports = { buscarPorHostnames };