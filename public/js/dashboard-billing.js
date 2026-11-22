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
const USAR_DADOS_MOCKADOS = true;

// Dados simulados de fechamento mensal (mês de referência com 30 dias: 01/11 a 30/11)
// Realizado até 21/11 (21 dias) + projeção linear de 22/11 a 30/11 (9 dias restantes)
const dadosMockados = {
    periodoMensal: {
        rotuloAcumulado: "01/11 a 21/11",
        comparativoAcumulado: "+8,4% vs. mesmo período do mês anterior",
        consumoKwh: "19.240 kWh",
        consumoDetalhe: "Acumulado no mês (01/11 a 21/11)",
        tarifaMedia: "R$ 0,66 / kWh",
        tarifaDetalhe: "Média mensal até 21/11 (R$ 0,51 a R$ 0,84)"
    },

    historicoDiario: {
        dias: [
            "01/11", "02/11", "03/11", "04/11", "05/11", "06/11", "07/11",
            "08/11", "09/11", "10/11", "11/11", "12/11", "13/11", "14/11",
            "15/11", "16/11", "17/11", "18/11", "19/11", "20/11", "21/11"
        ],
        custos: [
            510.00, 524.50, 518.20, 535.80, 542.10, 560.40, 548.90,
            555.00, 572.30, 580.60, 575.40, 588.20, 602.10, 594.80,
            615.40, 628.90, 642.00, 651.30, 668.50, 682.40, 695.10
        ],
        tarifas: [
            0.55, 0.56, 0.54, 0.58, 0.59, 0.61, 0.58,
            0.60, 0.62, 0.64, 0.63, 0.65, 0.67, 0.66,
            0.69, 0.71, 0.73, 0.74, 0.77, 0.79, 0.82
        ],
        diasProjecao: [
            "22/11", "23/11", "24/11", "25/11", "26/11",
            "27/11", "28/11", "29/11", "30/11"
        ]
    },

    rankingNodes: {
        labels: [
            "node-sismico-01",
            "node-sismico-02",
            "node-sismico-03",
            "node-sismico-04",
            "node-sismico-05",
            "node-sismico-06"
        ],
        custos: [2890.40, 2540.10, 2185.70, 1870.20, 1520.60, 1244.50],
        consumosKwh: [4520, 3980, 3410, 2920, 2380, 2030]
    }
};

let chartCustoInstancia = null;
let chartTarifaInstancia = null;
let chartNodesInstancia = null;

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function somarValores(lista) {
    return lista.reduce((acc, val) => acc + Number(val || 0), 0);
}

// Calcula regressão linear simples y = a + b*x para continuar os pontos até o fim do mês
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

function preencherKpis(dados, custosProjetados) {
    const acumuladoMes = somarValores(dados.historicoDiario.custos);
    const restanteProjetado = somarValores(custosProjetados);
    const projecaoFechamentoMes = acumuladoMes + restanteProjetado;
    const qtdDiasRestantes = dados.historicoDiario.diasProjecao.length;

    const elLabelAcumulado = document.querySelector('#kpiCustoAcumulado')?.closest('.kpi-card')?.querySelector('.kpi-label');
    if (elLabelAcumulado) elLabelAcumulado.textContent = 'Custo Acumulado (Mês)';

    const elLabelProjecao = document.querySelector('#kpiProjecaoFechamento')?.closest('.kpi-card')?.querySelector('.kpi-label');
    if (elLabelProjecao) elLabelProjecao.textContent = 'Projeção de Fechamento (Mês)';

    document.getElementById('kpiCustoAcumulado').textContent = formatarMoeda(acumuladoMes);
    document.getElementById('kpiCustoAcumuladoDetalhe').textContent =
        `${dados.periodoMensal.rotuloAcumulado} · ${dados.periodoMensal.comparativoAcumulado}`;

    document.getElementById('kpiProjecaoFechamento').textContent = formatarMoeda(projecaoFechamentoMes);
    document.getElementById('kpiProjecaoFechamentoDetalhe').textContent =
        `Acumulado + ${formatarMoeda(restanteProjetado)} projetados (${qtdDiasRestantes}d até 30/11)`;

    document.getElementById('kpiConsumoKwh').textContent = dados.periodoMensal.consumoKwh;
    document.getElementById('kpiConsumoKwhDetalhe').textContent = dados.periodoMensal.consumoDetalhe;

    document.getElementById('kpiTarifaMedia').textContent = dados.periodoMensal.tarifaMedia;
    document.getElementById('kpiTarifaMediaDetalhe').textContent = dados.periodoMensal.tarifaDetalhe;
}

function renderizarGraficoCustoProjecao(historicoDiario, custosProjetados) {
    const ctx = document.getElementById('chartCustoDiarioProjecao');
    if (!ctx) return;

    if (chartCustoInstancia) {
        chartCustoInstancia.destroy();
    }

    const labelsTotais = [...historicoDiario.dias, ...historicoDiario.diasProjecao];
    const valoresTotais = [...historicoDiario.custos, ...custosProjetados];
    const indiceCorte = historicoDiario.custos.length - 1;

    const corRealizado = '#0078d4';
    const corProjecao = '#f59e0b';

    const coresPontos = valoresTotais.map((_, idx) =>
        idx <= indiceCorte ? corRealizado : corProjecao
    );

    chartCustoInstancia = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labelsTotais,
            datasets: [{
                label: 'Custo Diário (R$)',
                data: valoresTotais,
                borderWidth: 3,
                tension: 0.25,
                fill: false,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: coresPontos,
                pointBorderColor: coresPontos,
                segment: {
                    borderColor: function (context) {
                        return context.p0DataIndex >= indiceCorte ? corProjecao : corRealizado;
                    },
                    borderDash: function (context) {
                        return context.p0DataIndex >= indiceCorte ? [6, 4] : undefined;
                    }
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const tipo = context.dataIndex <= indiceCorte ? 'Realizado' : 'Projeção Linear';
                            return `${tipo}: ${formatarMoeda(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function (value) {
                            return 'R$ ' + value;
                        }
                    }
                }
            }
        }
    });
}

function renderizarGraficoTarifa(historicoDiario) {
    const ctx = document.getElementById('chartTarifaDiaria');
    if (!ctx) return;

    if (chartTarifaInstancia) {
        chartTarifaInstancia.destroy();
    }

    chartTarifaInstancia = new Chart(ctx, {
        type: 'line',
        data: {
            labels: historicoDiario.dias,
            datasets: [{
                label: 'Tarifa Média (R$/kWh)',
                data: historicoDiario.tarifas,
                borderColor: '#006876',
                backgroundColor: 'rgba(0, 104, 118, 0.14)',
                borderWidth: 2.5,
                tension: 0.25,
                fill: true,
                pointRadius: 3.5,
                pointHoverRadius: 6,
                pointBackgroundColor: '#006876'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `Tarifa média: R$ ${context.parsed.y.toFixed(2)} / kWh`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function (value) {
                            return 'R$ ' + Number(value).toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

function renderizarGraficoNodes(rankingNodes) {
    const ctx = document.getElementById('chartCustoPorNode');
    if (!ctx) return;

    const scrollArea = ctx.closest('.chart-scroll-area');
    if (scrollArea) {
        const alturaPorNode = 44; // ajuste fino conforme o espaçamento das barras
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
                label: 'Custo Estimado (R$)',
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
                            const kwh = rankingNodes.consumosKwh[idx];
                            return `${custo} (${kwh.toLocaleString('pt-BR')} kWh)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return 'R$ ' + value;
                        }
                    }
                }
            }
        }
    });
}

function processarDadosDashboard(dados) {
    const custosProjetados = calcularProjecaoLinear(
        dados.historicoDiario.custos,
        dados.historicoDiario.diasProjecao.length
    );

    preencherKpis(dados, custosProjetados);
    renderizarGraficoCustoProjecao(dados.historicoDiario, custosProjetados);
    renderizarGraficoTarifa(dados.historicoDiario);
    renderizarGraficoNodes(dados.rankingNodes);
}

async function carregarDadosDashboard() {
    try {
        const resposta = await fetch('/api/billing/resumo');
        if (!resposta.ok) throw new Error('Erro ao buscar dados de billing');
        const dados = await resposta.json();
        processarDadosDashboard(dados);
    } catch (erro) {
        console.error('Erro ao carregar dashboard de billing:', erro);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js não carregou.');
        document.querySelectorAll('.chart-load-error').forEach(function (el) {
            el.style.display = 'flex';
        });
        return;
    }

    if (USAR_DADOS_MOCKADOS) {
        processarDadosDashboard(dadosMockados);
    } else {
        carregarDadosDashboard();
    }
});