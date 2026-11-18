/* Renderização da dashboard com Chart.js. Dados e cálculos ficam em dashboard-cluster.js. */
const graficosDashboard = {};
Chart.defaults.font.family = "Exo 2, sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.color = "#64748b";
Chart.defaults.animation = false;

// Encerra a instância do Chart.js antes de criar outro gráfico no mesmo lugar.
function destruirGrafico(id) {
    Object.keys(graficosDashboard)
        .filter((chave) => chave === id || chave.startsWith(id + "-"))
        .forEach((chave) => {
            graficosDashboard[chave].destroy();
            delete graficosDashboard[chave];
        });
}

// Remove a instância e o conteúdo visual do gráfico.
function limparGrafico(id) {
    destruirGrafico(id);
    document.getElementById(id).classList.remove("chart-empty");
    document.getElementById(id).replaceChildren();
}

// Cria o canvas e aplica as configurações comuns do Chart.js.
function criarGrafico(id, container, configuracao, descricao) {
    destruirGrafico(id);
    const caixa = document.createElement("div");
    caixa.className = "chartjs-box";
    const canvas = document.createElement("canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", descricao);
    canvas.textContent = descricao;
    caixa.appendChild(canvas);
    container.appendChild(caixa);
    configuracao.options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        ...configuracao.options
    };
    graficosDashboard[id] = new Chart(canvas, configuracao);
    return graficosDashboard[id];
}

// Ajusta gráficos que estavam dentro de painéis escondidos.
function redimensionarGraficos(id) {
    Object.keys(graficosDashboard)
        .filter((chave) => chave === id || chave.startsWith(id + "-"))
        .forEach((chave) => graficosDashboard[chave].resize());
}

// Configuração compartilhada das linhas reais e previstas.
function serieLinha(label, data, cor, tracejada = false) {
    // Uma série com só um ponto não forma linha: deixa esse ponto visível.
    const pontosValidos = data.filter((ponto) => {
        if (typeof ponto === "number") return Number.isFinite(ponto);
        return ponto !== null && typeof ponto === "object" && Number.isFinite(ponto.y);
    });
    return {
        label,
        data,
        borderColor: cor,
        backgroundColor: cor,
        borderWidth: 2,
        pointRadius: pontosValidos.length === 1 ? 4 : 0,
        pointHitRadius: 6,
        tension: 0.15,
        spanGaps: false,
        borderDash: tracejada ? [5, 4] : []
    };
}

// Configuração de eixo entre 0% e 100%.
function escalaPercentual(titulo) {
    return {
        min: 0,
        max: 100,
        title: { display: true, text: titulo },
        ticks: { stepSize: 50 },
        grid: { color: "#e9edf3" }
    };
}

// Configuração compartilhada dos eixos e da legenda dos gráficos de linhas.
function opcoesLinha(tituloY, maximo = 100) {
    return {
        interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { display: false }, ticks: { maxTicksLimit: 7, maxRotation: 0 } },
            y: {
                min: 0,
                max: maximo,
                title: { display: true, text: tituloY },
                grid: { color: "#e9edf3" }
            }
        }
    };
}

// Plugin local: marca de última coleta nos gráficos de linhas.
const marcaColeta = {
    id: "marcaColeta",
    afterDatasetsDraw(chart, args, options) {
        if (!options || options.indice === undefined) return;
        const { ctx, chartArea, scales } = chart;
        const x = scales.x.getPixelForValue(options.indice);
        ctx.save();
        ctx.strokeStyle = "#8293aa";
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#8293aa";
        ctx.font = "10px sans-serif";
        ctx.textAlign = x > chartArea.right - 60 ? "right" : "left";
        if (options.texto !== "")
            ctx.fillText(
                options.texto || "Última coleta",
                x + (x > chartArea.right - 60 ? -4 : 4),
                chartArea.top + 10
            );
        ctx.restore();
    }
};

// Plugin local: matriz numérica ou campo contínuo, com eixos e tooltips do Chart.js.
const matrizCalor = {
    id: "matrizCalor",
    beforeDatasetsDraw(chart, args, options) {
        const { ctx, chartArea, scales } = chart;
        const colunas = options.colunas,
            linhas = options.linhas;
        if (!colunas || !linhas || !chartArea.width || !chartArea.height) return;
        const largura = chartArea.width / colunas,
            altura = chartArea.height / linhas;
        ctx.save();
        ctx.beginPath();
        ctx.rect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
        ctx.clip();
        if (options.continuo) {
            // Imagem baixa resolução: cada pixel representa uma medição horária publicada no S3.
            // A interpolação e o blur alteram só a aparência; tooltips usam os valores originais.
            if (!chart.$campoCalor) {
                const campo = document.createElement("canvas");
                campo.width = colunas;
                campo.height = linhas;
                const tinta = campo.getContext("2d");
                options.valores.forEach((p) => {
                    tinta.fillStyle = options.cor(p.v);
                    tinta.fillRect(p.x, p.y, 1, 1);
                });
                chart.$campoCalor = campo;
            }
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.filter = "blur(4px)";
            ctx.drawImage(
                chart.$campoCalor,
                chartArea.left - 2,
                chartArea.top - 2,
                chartArea.width + 4,
                chartArea.height + 4
            );
            ctx.filter = "none";
        } else {
            options.valores.forEach((p) => {
                const x = scales.x.getPixelForValue(p.x),
                    y = scales.y.getPixelForValue(p.y);
                ctx.fillStyle = p.v === null ? "#edf0f4" : options.cor(p.v);
                ctx.beginPath();
                ctx.roundRect(
                    x - largura / 2 + 2,
                    y - altura / 2 + 1,
                    Math.max(1, largura - 4),
                    Math.max(1, altura - 2),
                    4
                );
                ctx.fill();
                ctx.fillStyle = "#334155";
                ctx.font = "600 11px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(p.v === null ? "—" : options.formatar(p.v), x, y);
            });
        }
        ctx.restore();
        if (options.continuo) {
            const inicio = chartArea.left + 75,
                fim = chartArea.right - 25,
                y = chartArea.top - 17;
            const gradiente = ctx.createLinearGradient(inicio, 0, fim, 0);
            [0, 35, 65, 100].forEach((v) =>
                gradiente.addColorStop(v / 100, options.cor(v))
            );
            ctx.save();
            ctx.fillStyle = gradiente;
            ctx.fillRect(inicio, y, Math.max(1, fim - inicio), 8);
            ctx.font = "10px sans-serif";
            ctx.fillStyle = "#64748b";
            ctx.textAlign = "left";
            ctx.fillText(options.recurso + " (%)", chartArea.left, y + 8);
            ctx.fillText("100", fim + 4, y + 8);
            ctx.restore();
        }
    }
};

// Cria as matrizes de calor com eixos e interação do Chart.js.
function criarMatriz(id, container, xLabels, yLabels, valores, options) {
    const configuracao = {
        type: "scatter",
        data: {
            datasets: [
                { data: valores, pointRadius: 0, pointHitRadius: 14, pointHoverRadius: 0 }
            ]
        },
        plugins: [matrizCalor],
        options: {
            layout: { padding: { top: options.continuo ? 24 : 0 } },
            plugins: {
                legend: { display: false },
                matrizCalor: {
                    colunas: xLabels.length,
                    linhas: yLabels.length,
                    valores,
                    ...options
                },
                tooltip: {
                    enabled: options.tooltip !== false,
                    callbacks: {
                        title: () => "",
                        label: (context) =>
                            xLabels[context.raw.x] +
                            " · " +
                            yLabels[context.raw.y] +
                            ": " +
                            (context.raw.v === null
                                ? "Sem dados"
                                : options.formatar(context.raw.v))
                    }
                }
            },
            scales: {
                x: {
                    type: "category",
                    labels: xLabels,
                    offset: true,
                    position: options.xTop ? "top" : "bottom",
                    grid: { display: false },
                    ticks: {
                        autoSkip: !!options.continuo,
                        maxTicksLimit: 7,
                        maxRotation: 0
                    },
                    title: { display: !!options.tituloX, text: options.tituloX }
                },
                y: {
                    type: "category",
                    labels: yLabels,
                    offset: true,
                    reverse: false,
                    grid: { display: false },
                    ticks: { autoSkip: false }
                }
            },
            onClick: (event, elements, chart) => {
                // Selecionar o nome do node no eixo; células de porcentagem não abrem detalhe.
                if (options.selecionarNode && event.y < chart.chartArea.top) {
                    const indice = chart.scales.x.getValueForPixel(event.x);
                    if (xLabels[indice])
                        requestAnimationFrame(() =>
                            options.selecionarNode(xLabels[indice])
                        );
                }
            }
        }
    };
    return criarGrafico(id, container, configuracao, options.descricao);
}

// GRÁFICO 1 — Disco real, previsão e limite de 90%, em TB.
function renderizarDisco(node) {
    limparGrafico("disk");
    const opcoes = opcoesLinha("Espaço ocupado (TB)", node.capacidade);
    const ultimo = node.real.findLastIndex(numero);
    if (ultimo >= 0)
        opcoes.plugins.marcaColeta = { indice: ultimo, texto: "Última coleta" };
    opcoes.scales.x.title = { display: true, text: "Dias" };
    criarGrafico(
        "disk",
        document.getElementById("disk"),
        {
            type: "line",
            plugins: [marcaColeta],
            data: {
                labels: node.datas.map(dia),
                datasets: [
                    serieLinha("Real", node.real, C.cyan),
                    serieLinha("Previsto", node.previsto, C.purple, true),
                    {
                        ...serieLinha(
                            "Limite de 90%",
                            Array(node.datas.length).fill(node.capacidade * 0.9),
                            C.amber,
                            true
                        ),
                        borderWidth: 1
                    }
                ]
            },
            options: opcoes
        },
        "Node " + node.id + ": ocupação do disco real e prevista em TB"
    );
}

// GRÁFICO 2 — Mapa de calor horário ou tabela com blocos de quatro horas.
function renderizarCalor(recurso, continuo) {
    limparGrafico("heat");
    const ordem = [0, 1, 2, 3, 4, 5, 6];
    const xLabels = continuo
        ? Array.from({ length: 24 }, (_, i) => i + "h")
        : ["0–4h", "4–8h", "8–12h", "12–16h", "16–20h", "20–24h"];
    const yLabels = heatDays;
    const valores = [];
    ordem.forEach((indice, y) =>
        xLabels.forEach((label, x) => {
            const v = continuo
                ? (heatReadings[indice][x]?.[recurso] ?? null)
                : media(
                      heatReadings[indice]
                          .slice(x * 4, x * 4 + 4)
                          .map((p) => p?.[recurso])
                  );
            valores.push({ x, y, v });
        })
    );
    criarMatriz("heat", document.getElementById("heat"), xLabels, yLabels, valores, {
        continuo,
        recurso,
        cor: corDoCalor,
        formatar: (v) => formatar(v) + "%",
        tituloX: "Horário",
        descricao: "Node " + nodeCalorAtual + ": mapa de " + recurso + " em %"
    });
}

// GRÁFICO 3 — Painéis de CPU e RAM, com real e previsto.
function renderizarConsumo(nodeId) {
    limparGrafico("expected");
    const container = document.getElementById("expected");
    container.classList.add("chartjs-panels");
    const dados = consumoPorNode[nodeId];
    [
        ["CPU", dados.cpuObserved, dados.cpuExpected, C.cyan],
        ["RAM", dados.ramObserved, dados.ramExpected, C.purple]
    ].forEach(([recurso, real, previsto, cor], i) => {
        const opcoes = opcoesLinha(recurso + " (%)");
        opcoes.scales.y.ticks = { stepSize: 50 };
        opcoes.scales.x.display = i === 1;
        const ultimo = real.findLastIndex(numero);
        if (ultimo >= 0)
            opcoes.plugins.marcaColeta = {
                indice: ultimo,
                texto: i === 0 ? "Última coleta" : ""
            };
        criarGrafico(
            "expected-" + recurso,
            container,
            {
                type: "line",
                plugins: [marcaColeta],
                data: {
                    labels: dados.datas.map((d) =>
                        new Date(d).toLocaleTimeString("pt-BR", {
                            timeZone: "America/Sao_Paulo",
                            hour: "2-digit",
                            minute: "2-digit"
                        })
                    ),
                    datasets: [
                        serieLinha(
                            "Real",
                            [...real, ...Array(24 - real.length).fill(null)],
                            cor
                        ),
                        serieLinha("Previsto", previsto, cor, true)
                    ]
                },
                options: opcoes
            },
            "Node " + nodeId + ": " + recurso + " real e previsto"
        );
    });
}

const tabelaIncidentes = {
    id: "tabelaIncidentes",
    afterDatasetsDraw(chart, args, options) {
        const { ctx, chartArea, scales } = chart;
        ctx.save();
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ["Crítico", "Atenção", "Total"].forEach((t, i) => {
            ctx.fillStyle = ["#c52e3e", "#b45309", "#475569"][i];
            ctx.fillText(t, chartArea.right + 28 + i * 48, chartArea.top - 12);
        });
        options.linhas.forEach((n, i) =>
            [n.criticos, n.atencao, n.criticos + n.atencao].forEach((v, j) => {
                ctx.fillStyle = ["#c52e3e", "#b45309", "#475569"][j];
                ctx.fillText(
                    v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }),
                    chartArea.right + 28 + j * 48,
                    scales.y.getPixelForValue(i)
                );
            })
        );
        ctx.restore();
    }
};

// DETALHE DA KPI — Barras de incidentes críticos e de atenção por node.
function renderizarRankingIncidentes(id, dados, titulo) {
    limparGrafico(id);
    const linhas = [...dados].sort(
        (a, b) => b.criticos + b.atencao - (a.criticos + a.atencao)
    );
    const maximo = Math.max(
        1,
        ...incidentesPorNode
            .concat(incidentesPrevistosPorNode)
            .map((n) => n.criticos + n.atencao)
    );
    criarGrafico(
        id,
        document.getElementById(id),
        {
            type: "bar",
            plugins: [tabelaIncidentes],
            data: {
                labels: linhas.map((n) => n.node),
                datasets: [
                    {
                        label: "Crítico",
                        data: linhas.map((n) => n.criticos),
                        backgroundColor: C.red,
                        barThickness: 14
                    },
                    {
                        label: "Atenção",
                        data: linhas.map((n) => n.atencao),
                        backgroundColor: C.amber,
                        barThickness: 14
                    }
                ]
            },
            options: {
                indexAxis: "y",
                layout: { padding: { right: 150, top: 22 } },
                plugins: { legend: { display: false }, tabelaIncidentes: { linhas } },
                scales: {
                    x: {
                        min: 0,
                        max: maximo,
                        stacked: true,
                        title: { display: true, text: "Quantidade de incidentes" },
                        grid: { color: C.grid }
                    },
                    y: { stacked: true, grid: { display: false } }
                }
            }
        },
        titulo
    );
}

