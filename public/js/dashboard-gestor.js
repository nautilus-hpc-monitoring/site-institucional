if (sessionStorage.NOME_USUARIO) {
    document.getElementById("b_usuario").innerHTML = sessionStorage.NOME_USUARIO;
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

document.addEventListener('DOMContentLoaded', function () {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js não carregou.');
        document.querySelectorAll('.chart-load-error').forEach(el => el.style.display = 'flex');
        return;
    }

    // Busca os dados unificados (MySQL + S3) via Back-end
    carregarDadosDashboard();
});

function carregarDadosDashboard() {
    fetch("/dashgestor/dados-gestor")
        .then(function (resposta) {
            if (resposta.ok) {
                resposta.json().then(function (res) {
                    console.log("Dados da dashboard carregados com sucesso:", res);
                    
                    // atualiza os 4 KPIs na tela
                    if (res.kpis) {
                        atualizarKpis(res.kpis);
                    }

                    // renderiza o Gráfico 1 
                    const dadosHistorico = res.graficoHistorico || [];
                    criarGraficoHistorico(dadosHistorico);

                    // renderiza o Gráfico 2 
                    const dadosProjecao = res.graficoProjecao || [];
                    renderVariacaoPrevista(dadosProjecao);
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
    document.getElementById("kpiSaudeOk").innerText = kpi.saudeOk || "0 OK";
    document.getElementById("kpiSaudeDetalhe").innerText = kpi.saudeDetalhe || "0 aviso · 0 crítico";
    document.getElementById("kpiDisponibilidade").innerText = kpi.disponibilidade || "0%";
    document.getElementById("kpiDisponibilidadeDetalhe").innerText = kpi.disponibilidadeDetalhe || "Nenhum node";
    document.getElementById("kpiDisco").innerText = kpi.disco || "Estável";
    document.getElementById("kpiDiscoDetalhe").innerText = kpi.discoDetalhe || "monitorando";
    document.getElementById("kpiAlertas24h").innerText = kpi.alertas24h !== undefined ? kpi.alertas24h : 0;
    document.getElementById("kpiAlertasDetalhe").innerText = kpi.alertasDetalhe || "0 aviso · 0 crítico";
}

/* GRÁFICO 1: Histórico de Incidentes por Node */
function criarGraficoHistorico(dadosHist) {
    const ctxHistorico = document.getElementById('chartHistorico');
    if (!ctxHistorico) return;

    // Suporta o formato { labels: [], valores: [] } retornado pelo controller integrado
    const labels = dadosHist.labels && dadosHist.labels.length > 0 ? dadosHist.labels : ['Sem dados'];
    const valores = dadosHist.valores && dadosHist.valores.length > 0 ? dadosHist.valores : [0];

    new Chart(ctxHistorico, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Incidentes',
                data: valores,
                backgroundColor: ['#0E5E75', '#0D9488', '#5B8DEF', '#7C3AED'],
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
                legend: { display: false },
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
                    ticks: { precision: 0 },
                    grid: { color: '#F1F5F9' }
                },
                y: {
                    grid: { display: false }
                }
            }
        }
    });
}

/* GRÁFICO 2: Projeção de Piora */
function renderVariacaoPrevista(dadosEntrada) {
    const canvasVariacao = document.getElementById('chartVariacao');
    if (!canvasVariacao) return;

    const nodes = dadosEntrada.length > 0 ? dadosEntrada.map(d => ({
        nome: d.nome || d.HOSTNAME || 'Node',
        janelas: d.janelas && d.janelas.length === 3 ? d.janelas : [1, 2, 3]
    })) : [
        { nome: 'node-Veras', janelas: [1, 2, 3] }
    ];

    function preverProxima(y) {
        const n = y.length;
        const xm = (n - 1) / 2;
        const ym = y.reduce((a, b) => a + b, 0) / n;
        let num = 0, den = 0;
        y.forEach((v, i) => { num += (i - xm) * (v - ym); den += (i - xm) ** 2; });
        const a = den !== 0 ? num / den : 0;
        const b = ym - a * xm;
        return Math.max(0, a * n + b);
    }

    const dados = nodes.map(n => {
        const ultimos30 = n.janelas[n.janelas.length - 1];
        const previsto = preverProxima(n.janelas);
        return {
            nome: n.nome,
            ultimos30,
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
                backgroundColor: dados.map(d => d.variacao > 0 ? '#d64545' : '#2a9d8f'),
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
                        label: (ctx) => {
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
                        text: '← melhorando   |   piorando →   (variação de incidentes em 30 dias)'
                    },
                    ticks: { precision: 0 },
                    grid: { color: 'rgba(0,0,0,0.06)' }
                },
                y: { grid: { display: false } }
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