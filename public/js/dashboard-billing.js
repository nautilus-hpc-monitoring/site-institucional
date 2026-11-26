if (sessionStorage.NOME_USUARIO) {
    const elUsuario = document.getElementById("b_usuario");
    if (elUsuario) elUsuario.innerHTML = sessionStorage.NOME_USUARIO;

    const usuarioMobile = document.getElementById("b_usuario_mobile");
    if (usuarioMobile) {
        usuarioMobile.innerHTML = sessionStorage.NOME_USUARIO;
    }
}

const mobileSidebar = document.getElementById('mobileSidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

if (document.getElementById('open-sidebar-btn')) {
    document.getElementById('open-sidebar-btn').onclick = function () {
        mobileSidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
    };
}

if (document.getElementById('close-sidebar-btn')) {
    document.getElementById('close-sidebar-btn').onclick = function () {
        mobileSidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    };
}

if (sidebarOverlay) {
    sidebarOverlay.onclick = function () {
        mobileSidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    };
}

// true = utiliza dados mockados
// false = busca os dados reais no backend
// Com backend ativo, mantém falso para usar dados reais.
const USAR_DADOS_MOCKADOS = false;

function montarMesesPadrao(quantidade) {
    const meses = [];
    const hoje = new Date();

    for (let i = quantidade - 1; i >= 0; i--) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        meses.push(`${ano}-${mes}`);
    }

    return meses;
}

let MESES_DISPONIVEIS = montarMesesPadrao(3);

function gerarRotulosDiarios(chaveMes, quantidadeDias) {
    const mes = chaveMes.split('-')[1];
    const rotulos = [];
    for (let dia = 1; dia <= quantidadeDias; dia++) {
        rotulos.push(`${String(dia).padStart(2, '0')}/${mes}`);
    }
    return rotulos;
}

function gerarSerieCusto(quantidadeDias, base, passo, amplitude) {
    const serie = [];
    for (let i = 0; i < quantidadeDias; i++) {
        const variacao = Math.sin((i + 1) * 1.4) * amplitude + ((i % 6) - 2) * (amplitude * 0.12);
        serie.push(Number((base + passo * i + variacao).toFixed(2)));
    }
    return serie;
}

function gerarSerieInteira(quantidadeDias, base, amplitude, passo = 0) {
    const serie = [];
    for (let i = 0; i < quantidadeDias; i++) {
        const valor = base + passo * i + Math.sin((i + 2) * 1.15) * amplitude + (i % 7 === 0 ? 1 : 0);
        serie.push(Math.max(0, Math.round(valor)));
    }
    return serie;
}

function gerarDecomposicao(quantidadeDias, baseConsumo, baseTarifa, tendenciaTarifa) {
    const impactoConsumo = [];
    const impactoTarifa = [];
    for (let i = 0; i < quantidadeDias; i++) {
        const consumo = baseConsumo + Math.sin((i + 1) * 0.8) * 16 + (i % 5) * 2.8;
        const tarifa = baseTarifa + Math.sin((i + 1) * 1.45) * 22 + i * tendenciaTarifa;
        impactoConsumo.push(Number(consumo.toFixed(2)));
        impactoTarifa.push(Number(tarifa.toFixed(2)));
    }
    return { impactoConsumo, impactoTarifa };
}

function criarMesMock(config) {
    const dias = gerarRotulosDiarios(config.chave, config.diasRealizados);
    const diasProjecao = gerarRotulosDiarios(config.chave, config.diasMes).slice(config.diasRealizados);

    return {
        periodoMensal: {
            descricaoMes: formatarMesAno(config.chave),
            rotuloAcumulado: `01/${config.chave.slice(5, 7)} a ${String(config.diasRealizados).padStart(2, '0')}/${config.chave.slice(5, 7)}`,
            consumoKwh: config.consumoKwh,
            consumoDetalhe: config.diasRealizados === config.diasMes
                ? `Consumo total do mês (${config.diasRealizados} dias)`
                : `Acumulado no mês (${config.diasRealizados} de ${config.diasMes} dias)`
        },
        historicoDiario: {
            dias,
            custos: gerarSerieCusto(config.diasRealizados, config.baseCusto, config.passoCusto, config.amplitudeCusto),
            diasProjecao
        },
        alertasDiarios: {
            aviso: gerarSerieInteira(config.diasRealizados, config.baseAviso, 1.7, 0.02),
            critico: gerarSerieInteira(config.diasRealizados, config.baseCritico, 1.2, 0.01)
        },
        decomposicaoDiaria: gerarDecomposicao(config.diasRealizados, config.baseImpactoConsumo, config.baseImpactoTarifa, config.tendenciaTarifa),
        rankingNodes: {
            labels: [
                'node-sismico-01',
                'node-sismico-02',
                'node-sismico-03',
                'node-sismico-04',
                'node-sismico-05',
                'node-sismico-06'
            ],
            custos: config.rankingCustos,
            consumosKwh: config.rankingConsumos
        }
    };
}

function formatarMesAno(chaveMes) {
    const [ano, mes] = chaveMes.split('-').map(Number);
    const data = new Date(ano, mes - 1, 1);
    return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

const dadosMockadosPorMes = {
    '2026-09': criarMesMock({
        chave: '2026-09',
        diasMes: 30,
        diasRealizados: 30,
        consumoKwh: 27940,
        baseCusto: 735,
        passoCusto: 4.1,
        amplitudeCusto: 29,
        baseAviso: 3.1,
        baseCritico: 1.5,
        baseImpactoConsumo: 58,
        baseImpactoTarifa: -18,
        tendenciaTarifa: 0.25,
        rankingCustos: [5310.55, 4880.43, 4298.77, 3820.66, 3412.92, 2874.51],
        rankingConsumos: [7920, 7240, 6555, 5980, 5320, 4700]
    }),
    '2026-10': criarMesMock({
        chave: '2026-10',
        diasMes: 31,
        diasRealizados: 31,
        consumoKwh: 30280,
        baseCusto: 770,
        passoCusto: 4.5,
        amplitudeCusto: 31,
        baseAviso: 3.4,
        baseCritico: 1.9,
        baseImpactoConsumo: 63,
        baseImpactoTarifa: 6,
        tendenciaTarifa: 0.4,
        rankingCustos: [5688.31, 5169.58, 4622.74, 4110.08, 3684.45, 3098.2],
        rankingConsumos: [8240, 7580, 6960, 6180, 5620, 4985]
    }),
    '2026-11': criarMesMock({
        chave: '2026-11',
        diasMes: 30,
        diasRealizados: 21,
        consumoKwh: 19240,
        baseCusto: 812,
        passoCusto: 5.3,
        amplitudeCusto: 34,
        baseAviso: 4.2,
        baseCritico: 2.4,
        baseImpactoConsumo: 66,
        baseImpactoTarifa: 20,
        tendenciaTarifa: 0.65,
        rankingCustos: [4230.22, 3915.18, 3499.67, 3120.53, 2785.2, 2301.86],
        rankingConsumos: [5920, 5520, 5010, 4590, 4110, 3620]
    })
};

let chartCustoInstancia = null;
let chartDecomposicaoInstancia = null;
let chartNodesInstancia = null;
let mesSelecionadoAtual = null;

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarNumero(valor, casas = 0) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas
    });
}

function formatarTarifaKwh(valor) {
    return `${Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
    })}/kWh`;
}

function somarValores(lista) {
    return lista.reduce((acc, val) => acc + Number(val || 0), 0);
}

function distribuirTotalPorPeso(total, pesos) {
    const quantidade = pesos.length;
    if (quantidade === 0 || total <= 0) {
        return new Array(quantidade).fill(0);
    }

    const somaPesos = somarValores(pesos);
    const pesosAjustados = somaPesos > 0
        ? pesos.map((peso) => Number(peso || 0))
        : new Array(quantidade).fill(1);

    const somaAjustada = somarValores(pesosAjustados);
    const distribuicao = pesosAjustados.map((peso) => (total * peso) / somaAjustada);
    const inteiros = distribuicao.map((valor) => Math.floor(valor));

    let restante = total - somarValores(inteiros);
    const ordemFracoes = distribuicao
        .map((valor, indice) => ({ indice, fracao: valor - Math.floor(valor) }))
        .sort((a, b) => b.fracao - a.fracao);

    for (let i = 0; i < ordemFracoes.length && restante > 0; i++) {
        inteiros[ordemFracoes[i].indice] += 1;
        restante -= 1;
    }

    return inteiros;
}

function obterAlertasPorNode(rankingNodes, alertasDiarios) {
    const quantidadeNodes = rankingNodes.labels?.length || 0;

    if (quantidadeNodes === 0) {
        return { aviso: [], critico: [] };
    }

    const avisoNodeApi = Array.isArray(rankingNodes.alertasAvisoPorNode)
        ? rankingNodes.alertasAvisoPorNode.map((valor) => Number(valor || 0))
        : null;
    const criticoNodeApi = Array.isArray(rankingNodes.alertasCriticoPorNode)
        ? rankingNodes.alertasCriticoPorNode.map((valor) => Number(valor || 0))
        : null;

    if (avisoNodeApi && criticoNodeApi && avisoNodeApi.length === quantidadeNodes && criticoNodeApi.length === quantidadeNodes) {
        return {
            aviso: avisoNodeApi,
            critico: criticoNodeApi
        };
    }

    const totalAvisoMes = somarValores(alertasDiarios?.aviso || []);
    const totalCriticoMes = somarValores(alertasDiarios?.critico || []);
    const pesosPorNode = rankingNodes.custos && rankingNodes.custos.length === quantidadeNodes
        ? rankingNodes.custos
        : new Array(quantidadeNodes).fill(1);

    return {
        aviso: distribuirTotalPorPeso(totalAvisoMes, pesosPorNode),
        critico: distribuirTotalPorPeso(totalCriticoMes, pesosPorNode)
    };
}

function calcularProjecaoLinear(valoresHistoricos, qtdDiasFuturos) {
    const n = valoresHistoricos.length;
    if (n === 0 || qtdDiasFuturos <= 0) return [];

    let somaX = 0;
    let somaY = 0;
    let somaXY = 0;
    let somaXX = 0;

    for (let i = 0; i < n; i++) {
        somaX += i;
        somaY += valoresHistoricos[i];
        somaXY += i * valoresHistoricos[i];
        somaXX += i * i;
    }

    const denominador = (n * somaXX - somaX * somaX);
    const inclinacao = denominador !== 0 ? (n * somaXY - somaX * somaY) / denominador : 0;
    const intercepto = (somaY - inclinacao * somaX) / n;

    const projetados = [];
    for (let k = 0; k < qtdDiasFuturos; k++) {
        const xFuturo = n + k;
        const yEstimado = Math.max(0, intercepto + inclinacao * xFuturo);
        projetados.push(Number(yEstimado.toFixed(2)));
    }

    return projetados;
}

function calcularMetricasMes(dados) {
    const acumuladoMes = somarValores(dados.historicoDiario.custos);
    const custosProjetados = calcularProjecaoLinear(
        dados.historicoDiario.custos,
        dados.historicoDiario.diasProjecao.length
    );
    const projecaoFechamento = acumuladoMes + somarValores(custosProjetados);
    const impactoTarifa = dados.decomposicaoDiaria.impactoTarifa
        .reduce((acc, valor) => acc + Math.abs(Number(valor || 0)), 0);
    const tarifaMedia = dados.periodoMensal.consumoKwh > 0
        ? acumuladoMes / dados.periodoMensal.consumoKwh
        : 0;

    return {
        acumuladoMes,
        custosProjetados,
        projecaoFechamento,
        consumoKwh: dados.periodoMensal.consumoKwh,
        impactoTarifa,
        tarifaMedia
    };
}

function calcularComparativo(valorAtual, valorAnterior, minimoBaseAbsoluta = 0) {
    if (valorAnterior === null || valorAnterior === undefined) {
        return null;
    }

    if (Math.abs(Number(valorAnterior || 0)) < minimoBaseAbsoluta) {
        return null;
    }

    const delta = Number(valorAtual || 0) - Number(valorAnterior || 0);
    const percentual = valorAnterior === 0 ? null : (delta / valorAnterior) * 100;
    return { delta, percentual };
}

function formatarPercentualComparativo(comparativo) {
    if (!comparativo || comparativo.percentual === null) return 'n/d';
    return `${comparativo.percentual > 0 ? '+' : ''}${comparativo.percentual.toFixed(1).replace('.', ',')}%`;
}

function aplicarClasseComparativo(elementoId, comparativo, aumentoPositivo) {
    const el = document.getElementById(elementoId);
    if (!el) return;

    el.classList.remove('up', 'down', 'neutral');

    if (!comparativo || comparativo.delta === 0) {
        el.classList.add('neutral');
        return;
    }

    const subiu = comparativo.delta > 0;
    const classe = subiu === aumentoPositivo ? 'up' : 'down';
    el.classList.add(classe);
}

function preencherKpis(dados, metricas, metricasMesAnterior) {
    const comparativoAcumulado = calcularComparativo(metricas.acumuladoMes, metricasMesAnterior?.acumuladoMes);
    const comparativoProjecao = calcularComparativo(metricas.projecaoFechamento, metricasMesAnterior?.projecaoFechamento);
    const comparativoConsumo = calcularComparativo(metricas.consumoKwh, metricasMesAnterior?.consumoKwh);
    const comparativoImpactoTarifa = calcularComparativo(metricas.impactoTarifa, metricasMesAnterior?.impactoTarifa);

    document.getElementById('kpiCustoAcumulado').textContent = formatarMoeda(metricas.acumuladoMes);
    document.getElementById('kpiCustoAcumuladoDetalhe').textContent =
        dados.periodoMensal.rotuloAcumulado;
    document.getElementById('kpiCustoAcumuladoComparativo').textContent =
        formatarPercentualComparativo(comparativoAcumulado);

    const detalheProjecao = `Acumulado + ${formatarMoeda(somarValores(metricas.custosProjetados))} projetados`;

    document.getElementById('kpiProjecaoFechamento').textContent = formatarMoeda(metricas.projecaoFechamento);
    document.getElementById('kpiProjecaoFechamentoDetalhe').textContent = detalheProjecao;
    document.getElementById('kpiProjecaoFechamentoComparativo').textContent =
        formatarPercentualComparativo(comparativoProjecao);

    document.getElementById('kpiConsumoKwh').textContent = `${formatarNumero(metricas.consumoKwh, 0)} kWh`;
    document.getElementById('kpiConsumoKwhDetalhe').textContent = dados.periodoMensal.rotuloAcumulado;
    document.getElementById('kpiConsumoKwhComparativo').textContent =
        formatarPercentualComparativo(comparativoConsumo);

    document.getElementById('kpiImpactoTarifa').textContent = formatarMoeda(metricas.impactoTarifa);
    document.getElementById('kpiImpactoTarifaDetalhe').textContent =
        `Tarifa média: ${formatarTarifaKwh(metricas.tarifaMedia)}`;
    document.getElementById('kpiImpactoTarifaComparativo').textContent =
        formatarPercentualComparativo(comparativoImpactoTarifa);

    aplicarClasseComparativo('kpiCustoAcumuladoComparativo', comparativoAcumulado, false);
    aplicarClasseComparativo('kpiProjecaoFechamentoComparativo', comparativoProjecao, false);
    aplicarClasseComparativo('kpiConsumoKwhComparativo', comparativoConsumo, false);
    aplicarClasseComparativo('kpiImpactoTarifaComparativo', comparativoImpactoTarifa, false);
}

function renderizarGraficoCustoProjecao(dados, metricas) {
    const ctx = document.getElementById('chartCustoDiarioProjecao');
    if (!ctx) return;

    if (chartCustoInstancia) {
        chartCustoInstancia.destroy();
    }

    const historicoDiario = dados.historicoDiario;
    const labelsTotais = [...historicoDiario.dias, ...historicoDiario.diasProjecao];
    const indiceCorte = historicoDiario.custos.length - 1;

    const custosRealizados = [...historicoDiario.custos, ...new Array(historicoDiario.diasProjecao.length).fill(null)];
    const linhaProjecao = new Array(labelsTotais.length).fill(null);
    if (metricas.custosProjetados.length > 0 && indiceCorte >= 0) {
        linhaProjecao[indiceCorte] = historicoDiario.custos[indiceCorte];
        metricas.custosProjetados.forEach((valor, idx) => {
            linhaProjecao[indiceCorte + 1 + idx] = valor;
        });
    }

    const alertasAviso = [...dados.alertasDiarios.aviso, ...new Array(historicoDiario.diasProjecao.length).fill(0)];
    const alertasCritico = [...dados.alertasDiarios.critico, ...new Array(historicoDiario.diasProjecao.length).fill(0)];

    chartCustoInstancia = new Chart(ctx, {
        data: {
            labels: labelsTotais,
            datasets: [
                {
                    type: 'bar',
                    label: 'Alertas de aviso',
                    yAxisID: 'y1',
                    data: alertasAviso,
                    backgroundColor: 'rgba(245, 158, 11, 0.35)',
                    borderColor: '#D97706',
                    borderWidth: 1,
                    barPercentage: 0.9,
                    categoryPercentage: 0.8,
                    stack: 'alertas'
                },
                {
                    type: 'bar',
                    label: 'Alertas críticos',
                    yAxisID: 'y1',
                    data: alertasCritico,
                    backgroundColor: 'rgba(220, 38, 38, 0.35)',
                    borderColor: '#B91C1C',
                    borderWidth: 1,
                    barPercentage: 0.9,
                    categoryPercentage: 0.8,
                    stack: 'alertas'
                },
                {
                    type: 'line',
                    label: 'Custo diário realizado',
                    yAxisID: 'y',
                    data: custosRealizados,
                    borderColor: '#0078d4',
                    backgroundColor: '#0078d4',
                    borderWidth: 3,
                    tension: 0.25,
                    pointRadius: 3,
                    pointHoverRadius: 5
                },
                {
                    type: 'line',
                    label: 'Projeção linear',
                    yAxisID: 'y',
                    data: linhaProjecao,
                    borderColor: '#F59E0B',
                    backgroundColor: '#F59E0B',
                    borderWidth: 3,
                    tension: 0.25,
                    spanGaps: true,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    borderDash: [6, 4]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            if (context.dataset.yAxisID === 'y') {
                                return `${context.dataset.label}: ${formatarMoeda(context.parsed.y)}`;
                            }
                            return `${context.dataset.label}: ${formatarNumero(context.parsed.y, 0)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    position: 'left',
                    beginAtZero: false,
                    ticks: {
                        callback: function (value) {
                            return formatarMoeda(value);
                        }
                    }
                },
                y1: {
                    position: 'right',
                    beginAtZero: true,
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        callback: function (value) {
                            return `${formatarNumero(value, 0)}`;
                        }
                    }
                }
            }
        }
    });
}

function renderizarGraficoDecomposicao(dados) {
    const ctx = document.getElementById('chartDecomposicaoCusto');
    if (!ctx) return;

    if (chartDecomposicaoInstancia) {
        chartDecomposicaoInstancia.destroy();
    }

    chartDecomposicaoInstancia = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dados.historicoDiario.dias,
            datasets: [
                {
                    label: 'Impacto de consumo',
                    data: dados.decomposicaoDiaria.impactoConsumo,
                    backgroundColor: 'rgba(14, 116, 144, 0.8)',
                    borderColor: '#0E7490',
                    borderWidth: 1,
                    stack: 'impacto'
                },
                {
                    label: 'Impacto de tarifa',
                    data: dados.decomposicaoDiaria.impactoTarifa,
                    backgroundColor: 'rgba(245, 158, 11, 0.75)',
                    borderColor: '#D97706',
                    borderWidth: 1,
                    stack: 'impacto'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${formatarMoeda(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    stacked: true,
                    ticks: {
                        callback: function (value) {
                            return formatarMoeda(value);
                        }
                    }
                },
                x: {
                    stacked: true
                }
            }
        }
    });
}

function renderizarGraficoNodes(rankingNodes, alertasPorNode) {
    const ctx = document.getElementById('chartCustoPorNode');
    if (!ctx) return;

    const scrollArea = ctx.closest('.chart-scroll-area');
    if (scrollArea) {
        const alturaPorNode = 44;
        const alturaMinima = 280;
        const alturaCalculada = Math.max(alturaMinima, rankingNodes.labels.length * alturaPorNode);
        scrollArea.style.height = `${alturaCalculada}px`;
    }

    if (chartNodesInstancia) {
        chartNodesInstancia.destroy();
    }

    chartNodesInstancia = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: rankingNodes.labels,
            datasets: [{
                label: 'Custo estimado (R$)',
                data: rankingNodes.custos,
                backgroundColor: '#1A1F71',
                borderRadius: 6,
                barThickness: 22
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const idx = context.dataIndex;
                            const custo = formatarMoeda(rankingNodes.custos[idx]);
                            const kwh = Number(rankingNodes.consumosKwh?.[idx] || 0);
                            const aviso = alertasPorNode.aviso[idx] || 0;
                            const critico = alertasPorNode.critico[idx] || 0;
                            return [
                                `${custo} (${kwh.toLocaleString('pt-BR')} kWh)`,
                                `Alertas: ${formatarNumero(aviso, 0)}`,
                                `Críticos: ${formatarNumero(critico, 0)}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return formatarMoeda(value);
                        }
                    }
                }
            }
        }
    });
}

function obterMesAnterior(chaveMes) {
    const indice = MESES_DISPONIVEIS.indexOf(chaveMes);
    if (indice <= 0) return null;
    return MESES_DISPONIVEIS[indice - 1];
}

function processarDadosDashboard(chaveMes, dados) {
    const metricas = calcularMetricasMes(dados);
    const chaveMesAnterior = obterMesAnterior(chaveMes);
    // Quando o backend já envia o mês anterior, usa direto.
    // Em modo mock, mantém o comportamento antigo para comparação local.
    const metricasMesAnterior = dados.metricasMesAnterior
        ? dados.metricasMesAnterior
        : (chaveMesAnterior ? calcularMetricasMes(dadosMockadosPorMes[chaveMesAnterior]) : null);

    const alertasPorNode = obterAlertasPorNode(dados.rankingNodes, dados.alertasDiarios);

    preencherKpis(dados, metricas, metricasMesAnterior);
    renderizarGraficoCustoProjecao(dados, metricas);
    renderizarGraficoDecomposicao(dados);
    renderizarGraficoNodes(dados.rankingNodes, alertasPorNode);
}

function preencherSeletorMes() {
    const seletorMes = document.getElementById('seletorMes');
    if (!seletorMes) return;

    seletorMes.innerHTML = '';

    if (!MESES_DISPONIVEIS.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Sem meses com dados';
        option.disabled = true;
        option.selected = true;
        seletorMes.appendChild(option);
        mesSelecionadoAtual = null;
        return;
    }

    MESES_DISPONIVEIS.forEach((chaveMes) => {
        const option = document.createElement('option');
        option.value = chaveMes;
        option.textContent = formatarMesAno(chaveMes);
        seletorMes.appendChild(option);
    });

    mesSelecionadoAtual = MESES_DISPONIVEIS[MESES_DISPONIVEIS.length - 1];
    seletorMes.value = mesSelecionadoAtual;
}

async function carregarMesesDisponiveis() {
    if (USAR_DADOS_MOCKADOS) {
        MESES_DISPONIVEIS = Object.keys(dadosMockadosPorMes).sort();
        return;
    }

    const idEmpresa = Number(sessionStorage.ID_EMPRESA);
    if (!Number.isSafeInteger(idEmpresa) || idEmpresa <= 0) {
        return;
    }

    try {
        const resposta = await fetch(`/dashbilling/meses?idEmpresa=${encodeURIComponent(idEmpresa)}`);
        if (!resposta.ok) {
            throw new Error(`Falha ao carregar meses (${resposta.status})`);
        }

        const dados = await resposta.json();
        if (!Array.isArray(dados.meses)) {
            return;
        }

        const mesesValidos = dados.meses
            .map((mes) => String(mes))
            .filter((mes) => /^\d{4}-\d{2}$/.test(mes))
            .sort();

        if (mesesValidos.length) {
            MESES_DISPONIVEIS = mesesValidos;
        }
    } catch (erro) {
        console.warn('Não foi possível carregar meses de billing. Mantendo meses padrão.', erro);
    }
}

async function carregarDadosDashboard(chaveMes) {
    try {
        const idEmpresa = Number(sessionStorage.ID_EMPRESA);
        if (!Number.isSafeInteger(idEmpresa) || idEmpresa <= 0) {
            throw new Error('Empresa não encontrada na sessão para consultar billing');
        }

        const resposta = await fetch(
            `/dashbilling/resumo?idEmpresa=${encodeURIComponent(idEmpresa)}&mes=${encodeURIComponent(chaveMes)}`
        );

        if (!resposta.ok) {
            let detalheErro = '';
            try {
                const corpoErro = await resposta.json();
                if (corpoErro?.erro) {
                    detalheErro = `: ${corpoErro.erro}`;
                }
            } catch (_) {
                detalheErro = '';
            }
            throw new Error(`Erro ao buscar dados de billing (${resposta.status})${detalheErro}`);
        }

        const dados = await resposta.json();
        processarDadosDashboard(chaveMes, dados);
    } catch (erro) {
        console.error('Erro ao carregar dashboard de billing:', erro);
    }
}

function atualizarDashboardPorMes(chaveMes) {
    if (!chaveMes) return;
    mesSelecionadoAtual = chaveMes;
    if (USAR_DADOS_MOCKADOS) {
        processarDadosDashboard(chaveMes, dadosMockadosPorMes[chaveMes]);
        return;
    }
    carregarDadosDashboard(chaveMes);
}

document.addEventListener('DOMContentLoaded', async function () {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js não carregou.');
        document.querySelectorAll('.chart-load-error').forEach(function (el) {
            el.style.display = 'flex';
        });
        return;
    }

    await carregarMesesDisponiveis();
    preencherSeletorMes();

    const seletorMes = document.getElementById('seletorMes');
    if (seletorMes) {
        seletorMes.addEventListener('change', function (event) {
            atualizarDashboardPorMes(event.target.value);
        });
    }

    if (mesSelecionadoAtual) {
        atualizarDashboardPorMes(mesSelecionadoAtual);
    }
});
