var S3Client = require("@aws-sdk/client-s3").S3Client;
var GetObjectCommand = require("@aws-sdk/client-s3").GetObjectCommand;
var awsCredentialsModel = require("../models/awsCredentialsModel");

async function buscarCredenciaisDoBanco() {
    const credenciais = await awsCredentialsModel.buscar();

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

const configuracaoS3 = {
    region: process.env.AWS_REGION || process.env.REGION_NAME || "us-east-1",
    maxAttempts: 2
};

// Sem esta opção, a AWS procura as credenciais no ambiente ou no perfil do servidor.
if (process.env.AWS_CREDENTIAL_SOURCE === "database") {
    configuracaoS3.credentials = buscarCredenciaisDoBanco;
}

const clienteS3 = new S3Client(configuracaoS3);

// Cada dashboard informa o caminho do JSON que deseja consultar.
async function lerJson(caminhoArquivo) {
    if (!process.env.BUCKET_NAME) {
        return {
            dados: null,
            aviso: "Configure BUCKET_NAME no servidor para carregar telemetria."
        };
    }

    try {
        const comando = new GetObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: caminhoArquivo
        });

        const resposta = await clienteS3.send(comando);
        const textoArquivo = await resposta.Body.transformToString();

        return { dados: JSON.parse(textoArquivo) };
    } catch (erro) {
        const arquivoNaoEncontrado = erro.name === "NoSuchKey" ||
            (erro.$metadata && erro.$metadata.httpStatusCode === 404);

        if (arquivoNaoEncontrado) {
            return { dados: null, aviso: "Arquivo ainda não publicado no S3." };
        }

        console.error("Arquivo do S3 indisponível:", erro.name);
        return {
            dados: null,
            aviso: "Não foi possível ler a telemetria do S3. Verifique configuração e permissões."
        };
    }
}

module.exports = {
    lerJson
};
