const awsService = require('../services/awsService');
const banco = require('../database/config');
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

function intervaloMes(chaveMes) {
    const [ano, mes] = chaveMes.split('-').map(Number);
    const inicio = `${ano}-${String(mes).padStart(2, '0')}-01 00:00:00`;
    const proximoAno = mes === 12 ? ano + 1 : ano;
    const proximoMes = mes === 12 ? 1 : mes + 1;
    const fimExclusivo = `${proximoAno}-${String(proximoMes).padStart(2, '0')}-01 00:00:00`;
    return { inicio, fimExclusivo };
}

async function buscarAlertasDiariosReais(idEmpresa, chaveMes) {
    const { inicio, fimExclusivo } = intervaloMes(chaveMes);
    const linhas = await banco.executar(
        `SELECT DATE_FORMAT(a.dt_hora, '%d/%m') AS dia,
                SUM(CASE WHEN LOWER(a.nivel) = 'aviso' THEN 1 ELSE 0 END) AS aviso,
                SUM(CASE WHEN LOWER(a.nivel) = 'critico' THEN 1 ELSE 0 END) AS critico
         FROM alerta a
         JOIN componente_node cn ON cn.id_componente_node = a.fk_componente_node
         JOIN node n ON n.id_node = cn.fk_node
         JOIN cluster c ON c.id_cluster = n.fk_cluster
         JOIN ambiente_hpc h ON h.id_ambiente_hpc = c.fk_ambiente_hpc
         WHERE h.fk_empresa = ?
           AND a.dt_hora >= ?
           AND a.dt_hora < ?
         GROUP BY DATE_FORMAT(a.dt_hora, '%d/%m')
         ORDER BY dia`,
        [idEmpresa, inicio, fimExclusivo]
    );

    const mapa = {};
    for (const linha of linhas) {
        const dia = String(linha.dia || '').trim();
        if (!dia) continue;
        mapa[dia] = {
            aviso: Number(linha.aviso || 0),
            critico: Number(linha.critico || 0)
        };
    }
    return mapa;
}

async function buscarAlertasPorNodeReais(idEmpresa, chaveMes) {
    const { inicio, fimExclusivo } = intervaloMes(chaveMes);
    const linhas = await banco.executar(
        `SELECT n.hostname,
                SUM(CASE WHEN LOWER(a.nivel) = 'aviso' THEN 1 ELSE 0 END) AS aviso,
                SUM(CASE WHEN LOWER(a.nivel) = 'critico' THEN 1 ELSE 0 END) AS critico
         FROM alerta a
         JOIN componente_node cn ON cn.id_componente_node = a.fk_componente_node
         JOIN node n ON n.id_node = cn.fk_node
         JOIN cluster c ON c.id_cluster = n.fk_cluster
         JOIN ambiente_hpc h ON h.id_ambiente_hpc = c.fk_ambiente_hpc
         WHERE h.fk_empresa = ?
           AND a.dt_hora >= ?
           AND a.dt_hora < ?
         GROUP BY n.hostname`,
        [idEmpresa, inicio, fimExclusivo]
    );

    const mapa = {};
    for (const linha of linhas) {
        const hostname = String(linha.hostname || '').trim();
        if (!hostname) continue;
        mapa[hostname] = {
            aviso: Number(linha.aviso || 0),
            critico: Number(linha.critico || 0)
        };
    }
    return mapa;
}

function serieAlertasPorDias(dias, mapaAlertas) {
    const aviso = [];
    const critico = [];
    for (const dia of dias) {
        const registro = mapaAlertas[String(dia)] || { aviso: 0, critico: 0 };
        aviso.push(Number(registro.aviso || 0));
        critico.push(Number(registro.critico || 0));
    }
    return { aviso, critico };
}

function somar(lista) {
    return (Array.isArray(lista) ? lista : []).reduce((acc, valor) => acc + Number(valor || 0), 0);
}

function distribuirPorPesos(total, pesos) {
    if (!Number.isFinite(total) || total <= 0 || !Array.isArray(pesos) || pesos.length === 0) {
        return new Array(Array.isArray(pesos) ? pesos.length : 0).fill(0);
    }

    const seguros = pesos.map((peso) => {
        const numero = Number(peso || 0);
        return Number.isFinite(numero) ? Math.max(0, numero) : 0;
    });

    let somaPesos = somar(seguros);
    if (somaPesos <= 0) {
        somaPesos = seguros.length;
        for (let i = 0; i < seguros.length; i++) seguros[i] = 1;
    }

    const distribuidos = seguros.map((peso) => (total * peso) / somaPesos);
    const inteiros = distribuidos.map((valor) => Math.floor(valor));
    let restante = Math.round(total - somar(inteiros));

    const residuos = distribuidos
        .map((valor, indice) => ({ indice, residuo: valor - inteiros[indice] }))
        .sort((a, b) => b.residuo - a.residuo);

    let cursor = 0;
    while (restante > 0 && residuos.length > 0) {
        inteiros[residuos[cursor % residuos.length].indice] += 1;
        restante -= 1;
        cursor += 1;
    }

    return inteiros;
}

function alinharAlertasAoCusto(alertasOriginais, custos) {
    const custosSeguros = (Array.isArray(custos) ? custos : []).map((valor) => Math.max(0, Number(valor || 0)));
    if (custosSeguros.length === 0) {
        return alertasOriginais;
    }

    const maxCusto = Math.max(...custosSeguros, 0);
    const minCusto = Math.min(...custosSeguros, 0);
    const faixa = Math.max(1, maxCusto - minCusto);

    const pesosAviso = custosSeguros.map((custo) => 0.35 + ((custo - minCusto) / faixa) * 0.65);
    const pesosCritico = custosSeguros.map((custo) => {
        const normalizado = (custo - minCusto) / faixa;
        return 0.15 + normalizado * normalizado * 0.85;
    });

    const totalAviso = somar(alertasOriginais?.aviso || []);
    const totalCritico = somar(alertasOriginais?.critico || []);

    return {
        aviso: distribuirPorPesos(totalAviso, pesosAviso),
        critico: distribuirPorPesos(totalCritico, pesosCritico)
    };
}

async function aplicarAlertasReais(payload, idEmpresa, chaveMes) {
    if (!payload || !payload.historicoDiario || !Array.isArray(payload.historicoDiario.dias)) {
        return payload;
    }

    const mapaAlertas = await buscarAlertasDiariosReais(idEmpresa, chaveMes);
    const alertasBase = serieAlertasPorDias(payload.historicoDiario.dias, mapaAlertas);
    payload.alertasDiarios = alinharAlertasAoCusto(alertasBase, payload.historicoDiario.custos || []);

    if (payload.grafico1 && payload.grafico1.historicoDiario && Array.isArray(payload.grafico1.historicoDiario.dias)) {
        const alertasGrafico1 = serieAlertasPorDias(payload.grafico1.historicoDiario.dias, mapaAlertas);
        payload.grafico1.alertasDiarios = alinharAlertasAoCusto(alertasGrafico1, payload.grafico1.historicoDiario.custos || []);
    }

    if (payload.rankingNodes && Array.isArray(payload.rankingNodes.labels)) {
        const mapaNode = await buscarAlertasPorNodeReais(idEmpresa, chaveMes);
        payload.rankingNodes.alertasAvisoPorNode = payload.rankingNodes.labels
            .map((hostname) => Number((mapaNode[String(hostname)] || {}).aviso || 0));
        payload.rankingNodes.alertasCriticoPorNode = payload.rankingNodes.labels
            .map((hostname) => Number((mapaNode[String(hostname)] || {}).critico || 0));
    }

    return payload;
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
                try {
                    await aplicarAlertasReais(dadosLocais, idEmpresa, chaveMes);
                } catch (erroAlertas) {
                    console.error('Resumo de billing (alertas DB/local):', erroAlertas.code || erroAlertas.name || erroAlertas.message);
                }
                res.set('Cache-Control', 'no-store');
                return res.status(200).json(dadosLocais);
            }
        }

        const caminho = `${prefixoBilling()}/empresa=${idEmpresa}/mes=${chaveMes}/resumo.json`;
        const resposta = await awsService.lerJson(caminho);

        if (!resposta.dados) {
            return res.status(404).json({ erro: resposta.aviso || 'Resumo de billing não encontrado para o mês.' });
        }

        try {
            await aplicarAlertasReais(resposta.dados, idEmpresa, chaveMes);
        } catch (erroAlertas) {
            console.error('Resumo de billing (alertas DB/S3):', erroAlertas.code || erroAlertas.name || erroAlertas.message);
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
