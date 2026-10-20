const { S3Client, ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");
const conexao = require("../database/config"); 

// Configuração do cliente S3
const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN
    }
});

// Função auxiliar para converter o stream do S3 em texto (CSV)
const streamToString = (stream) =>
    new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    });

// Função para ler CSV em texto e transformar em json
function csvParaJson(csvText) {
    const linhas = csvText.trim().split("\n");
    if (linhas.length === 0) return [];
    
    const cabecalho = linhas[0].split(";").map(h => h.trim());
    const resultados = [];

    for (let i = 1; i < linhas.length; i++) {
        const valores = linhas[i].split(";");
        const objeto = {};
        for (let j = 0; j < cabecalho.length; j++) {
            objeto[cabecalho[j]] = valores[j] ? valores[j].trim() : "";
        }
        resultados.push(objeto);
    }
    return resultados;
}

// Função auxiliar para buscar arquivos específicos da Gold no S3
async function lerCsvGoldDoS3(bucketName, prefixoSubpasta) {
    try {
        const comandoListar = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: `03-gold/${prefixoSubpasta}/`
        });
        const respostaS3 = await s3Client.send(comandoListar);
        
        if (!respostaS3.Contents || respostaS3.Contents.length === 0) return [];

        const arquivosCsv = respostaS3.Contents.filter(obj => obj.Key.endsWith('.csv'));
        if (arquivosCsv.length === 0) return [];

        arquivosCsv.sort((a, b) => b.LastModified - a.LastModified);
        const ultimaChave = arquivosCsv[0].Key;

        const comandoGet = new GetObjectCommand({
            Bucket: bucketName,
            Key: ultimaChave
        });

        const arquivoS3 = await s3Client.send(comandoGet);
        const conteudoCsv = await streamToString(arquivoS3.Body);
        return csvParaJson(conteudoCsv);
    } catch (erro) {
        console.error(`Erro ao ler ${prefixoSubpasta} do S3:`, erro);
        return [];
    }
}

async function buscarDadosGold(req, res) {
    try {
        const bucketName = process.env.BUCKET_NAME;

        // Buscar dados do Mysql (KPIs 1, 2 e 3)
        
        // Exemplo de query para calcular saúde dos nós a partir da tabela 'node'
        const instrucaoSqlSaude = `
            SELECT 
                SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END) as total_ok,
                SUM(CASE WHEN status = 'manut.' THEN 1 ELSE 0 END) as total_aviso,
                SUM(CASE WHEN status = 'inativo' THEN 1 ELSE 0 END) as total_critico,
                COUNT(*) as total_nodes
            FROM node;
        `;

        // Executa a query no banco
        let dadosSaudeNodes = { total_ok: 0, total_aviso: 0, total_critico: 0, total_nodes: 0 };
        
        try {
            const resultadoSql = await new Promise((resolve, reject) => {
                conexao.query(instrucaoSqlSaude, function (err, resultado) {
                    if (err) reject(err);
                    else resolve(resultado);
                });
            });
            if (resultadoSql && resultadoSql.length > 0) {
                dadosSaudeNodes = resultadoSql[0];
            }
        } catch (dbErr) {
            console.warn("Aviso: Não foi possível consultar o MySQL, usando fallback.", dbErr);
        }

        const totalOk = dadosSaudeNodes.total_ok || 0;
        const totalAviso = dadosSaudeNodes.total_aviso || 0;
        const totalCritico = dadosSaudeNodes.total_critico || 0;
        const totalNodes = dadosSaudeNodes.total_nodes || 1;
        const disponibilidadeCalc = ((totalOk / totalNodes) * 100).toFixed(1);

        // Buscar dados do Gold do S3 (KPI Alertas 24h + Gráficos)
        const kpisGold = await lerCsvGoldDoS3(bucketName, 'kpis');
        const historicoGold = await lerCsvGoldDoS3(bucketName, 'historico');
        const projecaoGold = await lerCsvGoldDoS3(bucketName, 'projecao');

        // Pega o resumo de alertas das 24h gerado pelo Python na Gold
        const resumoAlertas = kpisGold.length > 0 ? kpisGold[0] : { total_alertas_24h: 0, alertas_aviso: 0, alertas_critico: 0 };

        // Montar json final
        res.json({
            kpis: {
                saudeOk: `${totalOk} OK`,
                saudeDetalhe: `${totalAviso} aviso · ${totalCritico} crítico`,
                disponibilidade: `${disponibilidadeCalc.replace('.', ',')}%`,
                disponibilidadeDetalhe: `${totalCritico} nodes inativos`,
                disco: "Estável",
                discoDetalhe: `monitorando ${totalNodes} nodes`,
                alertas24h: Number(resumoAlertas.total_alertas_24h || 0),
                alertasDetalhe: `${resumoAlertas.alertas_aviso || 0} aviso · ${resumoAlertas.alertas_critico || 0} crítico`
            },
            graficoHistorico: {
                labels: historicoGold.map(h => h.HOSTNAME || h.nome || 'Node'),
                valores: historicoGold.map(h => Number(h.total_incidentes || 0))
            },
            graficoProjecao: projecaoGold.map(p => ({
                nome: p.nome,
                janelas: [Number(p.janela_antiga_1 || 0), Number(p.janela_antiga_2 || 0), Number(p.ultimos30 || 0)]
            }))
        });

    } catch (erro) {
        console.error("Erro interno ao buscar dados do Gestor:", erro);
        res.status(500).json({ erro: "Erro interno ao buscar dados da dashboard." });
    }
}

module.exports = {
    buscarDadosGold
};