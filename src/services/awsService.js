var credenciaisModel = require("../models/awsCredentialsModel");
var fromInstanceMetadata = require("@aws-sdk/credential-providers").fromInstanceMetadata;
var S3Client = require("@aws-sdk/client-s3").S3Client;
var GetObjectCommand = require("@aws-sdk/client-s3").GetObjectCommand;
var ListObjectsV2Command = require("@aws-sdk/client-s3").ListObjectsV2Command;

// 1. CREDENCIAIS — Busca as credenciais temporárias da função IAM da EC2.
var buscarNaEc2 = fromInstanceMetadata({ timeout: 2000, maxRetries: 2 });
var margemRenovacao = 5 * 60 * 1000;
var atualizacaoEmAndamento = null;
var temporizador = null;
var sincronizando = false;

function credenciaisValidas(credenciais) {
    if (!credenciais) return false;
    var expiracao = new Date(credenciais.expiration).getTime();
    return Boolean(credenciais.accessKeyId && credenciais.secretAccessKey && credenciais.sessionToken
        && Number.isFinite(expiracao) && expiracao - Date.now() > margemRenovacao);
}

async function buscarESalvarCredenciais() {
    var credenciais = await buscarNaEc2();
    if (!credenciaisValidas(credenciais)) throw new Error("Credenciais indisponiveis");
    await credenciaisModel.salvar(credenciais);
    return credenciais;
}

// Compartilha a mesma atualização quando chegam várias solicitações juntas.
function atualizar() {
    if (!atualizacaoEmAndamento) {
        atualizacaoEmAndamento = buscarESalvarCredenciais().finally(function () {
            atualizacaoEmAndamento = null;
        });
    }
    return atualizacaoEmAndamento;
}

// Usado pelo coletor, depois de autenticar o usuário e identificar seu node.
async function obter() {
    var credenciais = await credenciaisModel.buscar();
    return credenciaisValidas(credenciais) ? credenciais : atualizar();
}

// 2. SINCRONIZAÇÃO — Mantém a mesma margem, repetição e controle de início/parada.
async function ciclo() {
    var espera = 30000;
    try {
        var credenciais = await atualizar();
        var tempoRestante = new Date(credenciais.expiration).getTime() - Date.now() - margemRenovacao;
        espera = Math.max(30000, Math.min(60000, tempoRestante));
    } catch (erro) {
        console.error("Sincronizacao AWS indisponivel; nova tentativa em 30 segundos.");
    }
    if (sincronizando) {
        temporizador = setTimeout(ciclo, espera);
        temporizador.unref?.();
    }
}

function iniciar() {
    if (!sincronizando) {
        sincronizando = true;
        return ciclo();
    }
}

function parar() {
    sincronizando = false;
    clearTimeout(temporizador);
}

// 3. S3 — Todas as dashboards utilizam a mesma configuração de acesso.
async function buscarCredenciaisDoBanco() {
    var credenciais = await credenciaisModel.buscar();
    if (!credenciais || new Date(credenciais.expiration).getTime() <= Date.now()) {
        throw new Error("CredenciaisAWSExpiradas");
    }
    return {
        accessKeyId: credenciais.accessKeyId,
        secretAccessKey: credenciais.secretAccessKey,
        sessionToken: credenciais.sessionToken,
        expiration: new Date(credenciais.expiration)
    };
}

var configuracaoS3 = {
    region: process.env.AWS_REGION || process.env.REGION_NAME || "us-east-1",
    maxAttempts: 2
};
if (process.env.AWS_CREDENTIAL_SOURCE === "database") {
    configuracaoS3.credentials = buscarCredenciaisDoBanco;
}
// Sem database, o SDK usa a cadeia padrão: ambiente, perfil ou função IAM.
var clienteS3 = new S3Client(configuracaoS3);

function listarArquivos(bucket, prefixo) {
    return clienteS3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefixo }));
}

function lerArquivo(bucket, chave) {
    return clienteS3.send(new GetObjectCommand({ Bucket: bucket, Key: chave }));
}

// 4. JSON DA DASHBOARD — Preserva as mensagens e o retorno usados pelo cluster.
async function lerJson(caminhoArquivo) {
    if (!process.env.BUCKET_NAME) {
        return { dados: null, aviso: "Configure BUCKET_NAME no servidor para carregar telemetria." };
    }
    try {
        var resposta = await lerArquivo(process.env.BUCKET_NAME, caminhoArquivo);
        var textoArquivo = await resposta.Body.transformToString();
        return { dados: JSON.parse(textoArquivo) };
    } catch (erro) {
        var arquivoNaoEncontrado = erro.name === "NoSuchKey"
            || (erro.$metadata && erro.$metadata.httpStatusCode === 404);
        if (arquivoNaoEncontrado) {
            return { dados: null, aviso: "Arquivo ainda não publicado no S3." };
        }
        console.error("Arquivo do S3 indisponível:", erro.name);
        return { dados: null, aviso: "Não foi possível ler a telemetria do S3. Verifique configuração e permissões." };
    }
}

module.exports = { obter, atualizar, iniciar, parar, listarArquivos, lerArquivo, lerJson };
