const awsService = require('../services/awsService');
const fs = require('fs');
const path = require('path');

function validarMes(chaveMes) {
    if (typeof chaveMes !== 'string' || !/^\d{4}-\d{2}$/.test(chaveMes)) {
        return false;
    }
    const [ano, mes] = chaveMes.split('-').map(Number);
    return Number.isInteger(ano) && Number.isInteger(mes) && mes >= 1 && mes <= 12;
}

function validarEmpresa(idEmpresa) {
    const id = Number(idEmpresa);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function prefixoBilling() {
    return (process.env.BILLING_GOLD_PREFIX || '03-gold/billing').replace(/\/+$/, '');
}

function billingLocalDir() {
    const candidatos = [];
    if (process.env.BILLING_GOLD_LOCAL_DIR) {
        candidatos.push(path.resolve(process.env.BILLING_GOLD_LOCAL_DIR));
    }

    const raizAtual = process.cwd();
    candidatos.push(path.resolve(raizAtual, '..', 'captura-de-dados', 'gold_local'));
    candidatos.push(path.resolve(raizAtual, 'gold_local'));
    candidatos.push(path.resolve(__dirname, '..', '..', '..', 'captura-de-dados', 'gold_local'));

    for (const caminho of candidatos) {
        if (fs.existsSync(caminho)) {
            return caminho;
        }
    }

    return null;
}

function lerJsonLocal(caminhoArquivo) {
    try {
        if (!fs.existsSync(caminhoArquivo)) return null;
        return JSON.parse(fs.readFileSync(caminhoArquivo, 'utf-8'));
    } catch (_) {
        return null;
    }
}

async function resumo(req, res) {
    try {
        const idEmpresa = validarEmpresa(req.query.idEmpresa);
        if (!idEmpresa) {
            return res.status(400).json({ erro: 'Empresa não informada ou inválida.' });
        }

        const chaveMes = String(req.query.mes || '').trim();
        if (!validarMes(chaveMes)) {
            return res.status(400).json({ erro: 'Mês inválido. Use o formato YYYY-MM.' });
        }

        const dirLocal = billingLocalDir();
        if (dirLocal) {
            const caminhoLocal = path.join(dirLocal, prefixoBilling(), `empresa=${idEmpresa}`, `mes=${chaveMes}`, 'resumo.json');
            const dadosLocais = lerJsonLocal(caminhoLocal);
            if (dadosLocais) {
                res.set('Cache-Control', 'no-store');
                return res.status(200).json(dadosLocais);
            }
        }

        const caminho = `${prefixoBilling()}/empresa=${idEmpresa}/mes=${chaveMes}/resumo.json`;
        const resposta = await awsService.lerJson(caminho);

        if (!resposta.dados) {
            return res.status(404).json({ erro: resposta.aviso || 'Resumo de billing não encontrado para o mês.' });
        }

        res.set('Cache-Control', 'no-store');
        return res.status(200).json(resposta.dados);
    } catch (erro) {
        console.error('Resumo de billing (S3):', erro.code || erro.name);
        return res.status(503).json({ erro: 'Não foi possível carregar os dados de billing.' });
    }
}

async function meses(req, res) {
    try {
        const idEmpresa = validarEmpresa(req.query.idEmpresa);
        if (!idEmpresa) {
            return res.status(400).json({ erro: 'Empresa não informada ou inválida.' });
        }

        const dirLocal = billingLocalDir();
        if (dirLocal) {
            const caminhoLocal = path.join(dirLocal, prefixoBilling(), `empresa=${idEmpresa}`, 'meses.json');
            const dadosLocais = lerJsonLocal(caminhoLocal);
            if (dadosLocais && Array.isArray(dadosLocais.meses)) {
                const mesesValidos = dadosLocais.meses
                    .filter((mes) => validarMes(String(mes)))
                    .map(String);
                res.set('Cache-Control', 'no-store');
                return res.status(200).json({ meses: mesesValidos });
            }
        }

        const caminho = `${prefixoBilling()}/empresa=${idEmpresa}/meses.json`;
        const resposta = await awsService.lerJson(caminho);

        if (!resposta.dados) {
            return res.status(200).json({ meses: [] });
        }

        const mesesValidos = Array.isArray(resposta.dados.meses)
            ? resposta.dados.meses.filter((mes) => validarMes(String(mes))).map(String)
            : [];

        res.set('Cache-Control', 'no-store');
        return res.status(200).json({ meses: mesesValidos });
    } catch (erro) {
        console.error('Meses de billing (S3):', erro.code || erro.name);
        return res.status(503).json({ erro: 'Não foi possível carregar os meses disponíveis.' });
    }
}

module.exports = { resumo, meses };
