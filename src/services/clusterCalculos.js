const DIA = 24 * 60 * 60 * 1000;
const TRINTA_MINUTOS = 30 * 60 * 1000;
const SEMANAS_DE_HISTORICO = 4;
const REDUCAO_PERCENTUAL = 15;

// Datas dos gráficos: considera o horário de São Paulo.
function formatarDataLocal(data) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date(data));
}

function meiaNoite(data) {
    return new Date(formatarDataLocal(data) + "T00:00:00-03:00").getTime();
}

function inicioDaSemana(data) {
    const inicioDoDia = meiaNoite(data);
    const diaDaSemana = new Date(inicioDoDia).getUTCDay();
    const diasDesdeSegunda = (diaDaSemana + 6) % 7;

    return inicioDoDia - diasDesdeSegunda * DIA;
}

// Remove repetições por ID e desconsidera datas inválidas ou futuras.
function prepararAlertas(alertas, agora) {
    const alertasPorId = new Map();
    for (const alerta of alertas) {
        alertasPorId.set(alerta.id_alerta, alerta);
    }

    const alertasValidos = [];
    for (const alerta of alertasPorId.values()) {
        const horario = Date.parse(alerta.inicio);
        if (Number.isFinite(horario) && horario <= agora) {
            alertasValidos.push({
                hostname: alerta.hostname,
                nivel: alerta.nivel,
                horario: horario
            });
        }
    }

    return alertasValidos;
}

// Conta os alertas de cada node dentro de um período, sem incluir o instante final.
function contarAlertasPorNode(alertas, nodes, inicio, fim) {
    const contagem = [];

    for (const node of nodes) {
        let criticos = 0;
        let atencao = 0;

        for (const alerta of alertas) {
            if (
                alerta.hostname !== node.hostname ||
                alerta.horario < inicio ||
                alerta.horario >= fim
            ) {
                continue;
            }

            if (/cr[ií]tico/i.test(alerta.nivel)) {
                criticos++;
            } else {
                atencao++;
            }
        }

        contagem.push({ node: node.hostname, criticos: criticos, atencao: atencao });
    }

    return contagem;
}

function somarAlertas(contagem) {
    let total = 0;
    for (const node of contagem) {
        total += node.criticos + node.atencao;
    }
    return total;
}

// Gráfico de incidentes: frequência em quatro dias equivalentes, reduzida em 15%.
// É uma regra da dashboard, não uma probabilidade estatística validada.
function calcularFrequencias(alertas, nodes, hoje) {
    const frequencias = [];

    for (const node of nodes) {
        const dias = [];

        for (let diasAFrente = 1; diasAFrente <= 7; diasAFrente++) {
            const diaPrevisto = hoje + diasAFrente * DIA;
            const diaDaSemana = new Date(diaPrevisto).getUTCDay();
            let diasComAlerta = 0;

            for (let diasAtras = 1; diasAtras <= SEMANAS_DE_HISTORICO * 7; diasAtras++) {
                const diaHistorico = hoje - diasAtras * DIA;
                if (new Date(diaHistorico).getUTCDay() !== diaDaSemana) {
                    continue;
                }

                const teveAlerta = alertas.some(function (alerta) {
                    return (
                        alerta.hostname === node.hostname &&
                        alerta.horario >= diaHistorico &&
                        alerta.horario < diaHistorico + DIA
                    );
                });

                if (teveAlerta) {
                    diasComAlerta++;
                }
            }

            const frequenciaPercentual = (diasComAlerta / SEMANAS_DE_HISTORICO) * 100;
            const percentualAjustado =
                frequenciaPercentual * (1 - REDUCAO_PERCENTUAL / 100);

            dias.push({
                data: formatarDataLocal(diaPrevisto),
                percentual: percentualAjustado,
                ocorrencias: diasComAlerta,
                amostras: SEMANAS_DE_HISTORICO
            });
        }

        frequencias.push({ hostname: node.hostname, dias: dias });
    }

    return frequencias;
}

// KPI: maior atraso dos incidentes iniciados desde segunda e já encerrados.
function calcularMaiorAtraso(alertas, agora, slaMinutos) {
    const slaValido = Number.isFinite(slaMinutos) && slaMinutos > 0;
    const resultado = {
        minutos: null,
        hostname: null,
        componente: null,
        sla_minutos: slaValido ? slaMinutos : null,
        atraso_minutos: null,
        motivo: "Nenhum incidente encerrado nesta semana com duração disponível."
    };
    for (const alerta of alertas) {
        const inicio = Date.parse(alerta.inicio);
        const fim = Date.parse(alerta.fim);
        if (
            !Number.isFinite(inicio) ||
            !Number.isFinite(fim) ||
            inicio < inicioDaSemana(agora.getTime()) ||
            fim < inicio ||
            fim > agora.getTime()
        ) {
            continue;
        }
        const minutos = (fim - inicio) / 60000;
        if (resultado.minutos === null || minutos > resultado.minutos) {
            resultado.minutos = minutos;
            resultado.hostname = alerta.hostname;
            resultado.componente = alerta.componente;
        }
    }
    if (resultado.minutos !== null) {
        resultado.motivo = slaValido ? null : "SLA da empresa indisponível.";
        if (slaValido) {
            resultado.atraso_minutos = Math.max(resultado.minutos - slaMinutos, 0);
        }
    }
    return resultado;
}

function calcularAlertas(alertas, nodes, agora = new Date(), slaMinutos = null) {
    const horarioAtual = agora.getTime();
    const hoje = meiaNoite(horarioAtual);
    const segundaFeira = inicioDaSemana(horarioAtual);
    const alertasValidos = prepararAlertas(alertas, horarioAtual);

    // KPI: nodes que tiveram pelo menos um alerta nos últimos 30 minutos.
    const nodesRecentes = [];
    for (const alerta of alertasValidos) {
        if (
            alerta.horario >= horarioAtual - TRINTA_MINUTOS &&
            !nodesRecentes.includes(alerta.hostname)
        ) {
            nodesRecentes.push(alerta.hostname);
        }
    }
    nodesRecentes.sort();

    // KPI e detalhamento: compara o mesmo tempo decorrido nas três semanas.
    const observados = contarAlertasPorNode(
        alertasValidos,
        nodes,
        segundaFeira,
        horarioAtual + 1
    );
    const semanaPassada = contarAlertasPorNode(
        alertasValidos,
        nodes,
        segundaFeira - 7 * DIA,
        horarioAtual - 7 * DIA + 1
    );
    const semanaRetrasada = contarAlertasPorNode(
        alertasValidos,
        nodes,
        segundaFeira - 14 * DIA,
        horarioAtual - 14 * DIA + 1
    );

    const previstos = [];
    for (let indice = 0; indice < nodes.length; indice++) {
        previstos.push({
            node: nodes[indice].hostname,
            criticos:
                (semanaPassada[indice].criticos + semanaRetrasada[indice].criticos) / 2,
            atencao: (semanaPassada[indice].atencao + semanaRetrasada[indice].atencao) / 2
        });
    }

    const totalObservado = somarAlertas(observados);
    const totalEsperado = somarAlertas(previstos);
    let variacao = null;
    if (totalEsperado > 0) {
        variacao = ((totalObservado - totalEsperado) / totalEsperado) * 100;
    } else if (totalObservado === 0) {
        variacao = 0;
    }

    // Zero alertas significa ausência de registros; não garante que a coleta estava funcionando.
    return {
        nodes_30min: {
            quantidade: nodesRecentes.length,
            total_nodes: nodes.length,
            hostnames: nodesRecentes
        },
        maior_atraso: calcularMaiorAtraso(alertas, agora, slaMinutos),
        comparacao: {
            observado: totalObservado,
            esperado: totalEsperado,
            variacao: variacao,
            inicio: new Date(segundaFeira).toISOString(),
            fim: agora.toISOString()
        },
        observados: observados,
        previstos: previstos,
        frequencias: calcularFrequencias(alertasValidos, nodes, hoje),
        janela_alertas: {
            inicio: new Date(hoje - SEMANAS_DE_HISTORICO * 7 * DIA).toISOString(),
            fim: agora.toISOString()
        }
    };
}

// Confere o arquivo da ETL e mantém somente os nodes cadastrados neste cluster.
function normalizarGold(gold, nodes, idCluster) {
    if (!gold) {
        return { nodes: [], avisos: ["Telemetria ainda não publicada no S3."] };
    }

    const metadados = gold.metadados || {};
    if (Number(metadados.cluster_id) !== idCluster) {
        throw new Error("ClusterGoldInvalido");
    }

    if (gold.schema_version !== 2 || !Array.isArray(gold.nodes)) {
        return {
            nodes: [],
            avisos: [
                "A ETL precisa publicar o contrato v2 por node para os gráficos atuais."
            ]
        };
    }

    if (metadados.demonstrativo === true) {
        throw new Error("DadosDemonstrativos");
    }

    const nomesCadastrados = nodes.map(function (node) {
        return node.hostname;
    });
    const nodesValidados = [];

    for (const node of gold.nodes) {
        if (nomesCadastrados.includes(node.hostname)) {
            nodesValidados.push({
                hostname: node.hostname,
                disco: node.disco || null,
                calor: node.calor || null,
                consumo: node.consumo || null,
                memoria: node.memoria || null,
                medias_semana: node.medias_semana || null,
                picos: node.picos || null
            });
        }
    }

    return { nodes: nodesValidados, metadados: gold.metadados, avisos: [] };
}

// Compara médias por componente e node, desde segunda até a última coleta.
// Arquivos de outra semana são ignorados até a ETL publicar a nova média.
function componenteMaiorMedia(nodes, agora = new Date()) {
    const componentes = ["CPU", "RAM", "Disco", "Swap"];
    const segunda = inicioDaSemana(agora.getTime());
    let maiorMedia = null;

    for (const node of nodes) {
        const resumo = node.medias_semana;
        if (
            !resumo ||
            Date.parse(resumo.inicio) !== segunda ||
            !Number.isFinite(Date.parse(resumo.fim)) ||
            Date.parse(resumo.fim) < segunda ||
            Date.parse(resumo.fim) > agora.getTime()
        ) {
            continue;
        }
        for (const componente of componentes) {
            const percentual = resumo.valores?.[componente];
            if (
                typeof percentual !== "number" ||
                !Number.isFinite(percentual) ||
                percentual < 0 ||
                percentual > 100
            ) {
                continue;
            }
            if (!maiorMedia || percentual > maiorMedia.percentual) {
                maiorMedia = {
                    hostname: node.hostname,
                    componente: componente,
                    percentual: percentual,
                    inicio: resumo.inicio,
                    fim: resumo.fim
                };
            }
        }
    }
    return maiorMedia;
}

module.exports = {
    calcularAlertas,
    normalizarGold,
    componenteMaiorMedia,
    meiaNoite,
    DIA
};
