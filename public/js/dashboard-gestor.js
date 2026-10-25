if (sessionStorage.NOME_USUARIO) {
document.getElementById("b_usuario").innerHTML = sessionStorage.NOME_USUARIO;

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

// Dados simulados no mesmo formato esperado pelo backend
const dadosMockados = {
kpis: {
saudeOk: "8 OK",
saudeDetalhe: "3 aviso · 1 crítico",
disponibilidade: "96,8%",
disponibilidadeDetalhe: "12 nodes monitorados",
disco: "18 dias",
discoDetalhe: "node-07 · previsão de esgotamento",
alertas24h: 17,
alertasDetalhe: "11 avisos · 6 críticos"
},

// Histórico de incidentes por node nos últimos 30 dias
graficoHistorico: {
    labels: [
        "node-07",
        "node-03",
        "node-11",
        "node-02",
        "node-09",
        "node-05"
    ],
    valores: [24, 19, 15, 11, 7, 3]
},

// Quantidade de incidentes em três períodos de 30 dias:
// [período mais antigo, período intermediário, últimos 30 dias]
graficoProjecao: [
    {
        nome: "node-07",
        janelas: [12, 18, 24]
    },
    {
        nome: "node-03",
        janelas: [10, 14, 19]
    },
    {
        nome: "node-11",
        janelas: [17, 16, 15]
    },
    {
        nome: "node-02",
        janelas: [8, 10, 11]
    },
    {
        nome: "node-09",
        janelas: [12, 9, 7]
    },
    {
        nome: "node-05",
        janelas: [9, 6, 3]
    }
]

};

document.addEventListener('DOMContentLoaded', function () {
if (typeof Chart === 'undefined') {
console.error('Chart.js não carregou.');
document.querySelectorAll('.chart-load-error').forEach(function (el) {
el.style.display = 'flex';
});
return;
}

if (USAR_DADOS_MOCKADOS) {
    console.log("Dashboard utilizando dados mockados.");
    processarDadosDashboard(dadosMockados);
} else {
    carregarDadosDashboard();
}

});

// Processa os dados recebidos, sejam mockados ou reais
function processarDadosDashboard(res) {
console.log("Dados da dashboard carregados:", res);

// Atualiza os 4 KPIs
if (res.kpis) {
    atualizarKpis(res.kpis);
}

// Renderiza o gráfico de histórico
const dadosHistorico = res.graficoHistorico || {
    labels: [],
    valores: []
};

criarGraficoHistorico(dadosHistorico);

// Renderiza o gráfico de projeção
const dadosProjecao = res.graficoProjecao || [];

renderVariacaoPrevista(dadosProjecao);

}

// Busca os dados reais no backend
function carregarDadosDashboard() {
fetch("/dashgestor/dados-gestor")
.then(function (resposta) {
if (resposta.ok) {
resposta.json().then(function (res) {
processarDadosDashboard(res);
});
} else {
console.error("Erro ao buscar dados da rota do dashboard.");
}
})
.catch(function (erro) {
console.error("Erro na requisição fetch:", erro);
});
}

function atualizarKpis(kpi) {
document.getElementById("kpiSaudeOk").innerText =
kpi.saudeOk || "0 OK";

document.getElementById("kpiSaudeDetalhe").innerText =
    kpi.saudeDetalhe || "0 aviso · 0 crítico";

document.getElementById("kpiDisponibilidade").innerText =
    kpi.disponibilidade || "0%";

document.getElementById("kpiDisponibilidadeDetalhe").innerText =
    kpi.disponibilidadeDetalhe || "Nenhum node";

document.getElementById("kpiDisco").innerText =
    kpi.disco || "Estável";

document.getElementById("kpiDiscoDetalhe").innerText =
    kpi.discoDetalhe || "Monitorando";

document.getElementById("kpiAlertas24h").innerText =
    kpi.alertas24h !== undefined ? kpi.alertas24h : 0;

document.getElementById("kpiAlertasDetalhe").innerText =
    kpi.alertasDetalhe || "0 aviso · 0 crítico";

}

/* GRÁFICO 1: Histórico de Incidentes por Node */
function criarGraficoHistorico(dadosHist) {
const ctxHistorico = document.getElementById('chartHistorico');

if (!ctxHistorico) return;

const labels = dadosHist.labels && dadosHist.labels.length > 0
    ? dadosHist.labels
    : ['Sem dados'];

const valores = dadosHist.valores && dadosHist.valores.length > 0
    ? dadosHist.valores
    : [0];

new Chart(ctxHistorico, {
    type: 'bar',
    data: {
        labels: labels,
        datasets: [{
            label: 'Incidentes',
            data: valores,
            backgroundColor: [
                '#0E5E75',
                '#0D9488',
                '#5B8DEF',
                '#7C3AED',
                '#36A2A1',
                '#64748B'
            ],
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.65
        }]
    },
    options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return `${context.raw} incidentes`;
                    }
                }
            }
        },
        scales: {
            x: {
                beginAtZero: true,
                ticks: {
                    precision: 0
                },
                grid: {
                    color: '#F1F5F9'
                }
            },
            y: {
                grid: {
                    display: false
                }
            }
        }
    }
});

}

/* GRÁFICO 2: Projeção de Piora */
function renderVariacaoPrevista(dadosEntrada) {
const canvasVariacao = document.getElementById('chartVariacao');

if (!canvasVariacao) return;

const nodes = dadosEntrada.length > 0
    ? dadosEntrada.map(d => ({
        nome: d.nome || d.HOSTNAME || 'Node',
        janelas: d.janelas && d.janelas.length === 3
            ? d.janelas
            : [1, 2, 3]
    }))
    : [
        {
            nome: 'Sem dados',
            janelas: [0, 0, 0]
        }
    ];

function preverProxima(y) {
    const n = y.length;
    const xm = (n - 1) / 2;
    const ym = y.reduce((a, b) => a + b, 0) / n;

    let num = 0;
    let den = 0;

    y.forEach((v, i) => {
        num += (i - xm) * (v - ym);
        den += (i - xm) ** 2;
    });

    const a = den !== 0 ? num / den : 0;
    const b = ym - a * xm;

    return Math.max(0, a * n + b);
}

const dados = nodes.map(n => {
    const ultimos30 = n.janelas[n.janelas.length - 1];
    const previsto = preverProxima(n.janelas);

    return {
        nome: n.nome,
        ultimos30: ultimos30,
        previsto: +previsto.toFixed(1),
        variacao: +(previsto - ultimos30).toFixed(1)
    };
});

dados.sort((a, b) => b.variacao - a.variacao);

new Chart(canvasVariacao, {
    type: 'bar',
    data: {
        labels: dados.map(d => d.nome),
        datasets: [{
            label: 'Variação prevista',
            data: dados.map(d => d.variacao),
            backgroundColor: dados.map(d =>
                d.variacao > 0 ? '#d64545' : '#2a9d8f'
            ),
            borderRadius: 6,
            barThickness: 22
        }]
    },
    options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: function (ctx) {
                        const d = dados[ctx.dataIndex];
                        const sinal = d.variacao > 0 ? '+' : '';

                        return [
                            `Últimos 30 dias: ${d.ultimos30} incidentes`,
                            `Previsto (próx. 30 dias): ${d.previsto}`,
                            `Variação: ${sinal}${d.variacao}`
                        ];
                    }
                }
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: '← melhorando | piorando → (variação de incidentes em 30 dias)'
                },
                ticks: {
                    precision: 0
                },
                grid: {
                    color: 'rgba(0,0,0,0.06)'
                }
            },
            y: {
                grid: {
                    display: false
                }
            }
        }
    }
});

if (dados.length > 0) {
    const pior = dados[0];
    const sub = document.getElementById('subtituloVariacao');

    if (sub) {
        sub.textContent = pior.variacao > 0
            ? `${pior.nome} é o que mais piora: ${pior.ultimos30} → ${pior.previsto} incidentes (candidato à substituição)`
            : 'Nenhum node apresenta tendência de piora';
    }
}

}