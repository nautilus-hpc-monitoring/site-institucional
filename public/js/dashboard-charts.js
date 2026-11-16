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
    return {
        label,
        data,
        borderColor: cor,
        backgroundColor: cor,
        borderWidth: 2,
        pointRadius: 0,
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

// GRÁFICO 4 — Percentuais de incidentes por dia e node.
function renderizarFrequencias(nodes) {
    limparGrafico("forecast");
    if (!nodes.length) return;
    const valores = [];
    diasPrevisao.forEach((dia, y) =>
        nodes.forEach((node, x) => {
            const r = calcularFrequencia(
                historicoPreditivo[node.id]?.alertas,
                dia.indice
            );
            valores.push({ x, y, v: r ? r.percentual : null });
        })
    );
    criarMatriz(
        "forecast",
        document.getElementById("forecast"),
        nodes.map((n) => n.id),
        diasPrevisao.map((d) => d.label),
        valores,
        {
            cor: (v) => "rgba(255,117,19," + (0.06 + (0.62 * v) / 100) + ")",
            formatar: (v) =>
                v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%",
            xTop: true,
            tooltip: false,
            selecionarNode: (node) => selecionarNodeDashboard(node, "forecast"),
            descricao:
                "Estimativa de incidentes por dia e node: quatro semanas e redução relativa de 15%"
        }
    );
}

const rotulosMemoria = {
    id: "rotulosMemoria",
    afterDatasetsDraw(chart, args, options) {
        const { ctx, chartArea, scales } = chart;
        ctx.save();
        ctx.fillStyle = "#475569";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        options.textos.forEach((texto, i) =>
            ctx.fillText(texto, chartArea.right + 8, scales.y.getPixelForValue(i))
        );
        ctx.restore();
    }
};

// GRÁFICO 5 — Ranking dos minutos com RAM alta e envio para swap.
function renderizarMemoria(nodes) {
    limparGrafico("swap");
    const ranking = nodes
        .filter((n) => memoriaPorNode[n.id])
        .map((n) => ({
            id: n.id,
            dados: memoriaPorNode[n.id],
            ...resumirMemoria(memoriaPorNode[n.id])
        }))
        .sort((a, b) => b.minutos - a.minutos);
    if (!ranking.length) return;
    const textos = ranking.map((n) =>
        n.dados.semSwap
            ? "Sem swap"
            : !n.cobertura
              ? "Sem dados"
              : n.minutos
                ? n.minutos + " min"
                : "Sem sinais"
    );
    const abrir = (event, elements, chart) => {
        if (event.y < chart.chartArea.top || event.y > chart.chartArea.bottom) return;
        const indice = chart.scales.y.getValueForPixel(event.y);
        if (ranking[indice])
            requestAnimationFrame(() => detalharMemoria(ranking[indice].id));
    };
    criarGrafico(
        "swap",
        document.getElementById("swap"),
        {
            type: "bar",
            plugins: [rotulosMemoria],
            data: {
                labels: ranking.map((n) => n.id),
                datasets: [
                    {
                        label: "Minutos acumulados",
                        data: ranking.map((n) => n.minutos),
                        backgroundColor: C.amber,
                        borderRadius: 4,
                        barThickness: 12
                    }
                ]
            },
            options: {
                indexAxis: "y",
                layout: { padding: { right: 82 } },
                plugins: {
                    legend: { display: false },
                    rotulosMemoria: { textos },
                    tooltip: {
                        callbacks: { label: (context) => textos[context.dataIndex] }
                    }
                },
                scales: {
                    x: {
                        min: 0,
                        suggestedMax: Math.max(1, ...ranking.map((n) => n.minutos)),
                        title: { display: true, text: "Minutos acumulados" },
                        grid: { color: C.grid }
                    },
                    y: { grid: { display: false } }
                },
                onClick: abrir
            }
        },
        "Minutos acumulados com RAM alta e envio para swap por node. Clique para abrir o histórico."
    );
    // Acesso por teclado ao mesmo detalhe oferecido pelas barras.
    const atalhos = document.createElement("div");
    atalhos.className = "chartjs-access-links";
    ranking.forEach((n) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = "Ver memória de " + n.id;
        b.addEventListener("click", () => detalharMemoria(n.id));
        atalhos.appendChild(b);
    });
    document.getElementById("swap").appendChild(atalhos);
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

// DETALHE DO GRÁFICO 5 — Histórico de RAM e taxas de swap.
function renderizarDetalheMemoria(node, dados, resumo) {
    const container = document.getElementById("memory-timeline");
    container.className = "chartjs-memory-detail";
    const inicio = dados.leituras[0].timestamp,
        fim = dados.leituras.at(-1).timestamp;
    const formato = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        hourCycle: "h23"
    });
    const pontos = (campo) =>
        resumo.intervalos.map((p) => ({
            x: (p.timestamp - inicio) / 3600000,
            y: p.valido ? p[campo] : null
        }));
    const montar = (chave, datasets, titulo, maximo) => {
        const opcoes = opcoesLinha(titulo, maximo);
        opcoes.scales.x = {
            type: "linear",
            min: 0,
            max: (fim - inicio) / 3600000,
            ticks: {
                stepSize: 1,
                autoSkip: false,
                maxRotation: 0,
                font: { size: 9 },
                callback: (h) => formato.format(new Date(inicio + h * 3600000)) + "h"
            },
            grid: { color: C.grid }
        };
        criarGrafico(
            chave,
            container,
            { type: "line", data: { datasets }, options: opcoes },
            "Node " + node + ": " + titulo
        );
    };
    montar(
        "memory-timeline-ram",
        [
            serieLinha("RAM em uso", pontos("ram"), C.cyan),
            {
                ...serieLinha(
                    "Limite de 90%",
                    [
                        { x: 0, y: 90 },
                        { x: (fim - inicio) / 3600000, y: 90 }
                    ],
                    C.red,
                    true
                ),
                borderWidth: 1
            }
        ],
        "RAM em uso (%)",
        100
    );
    montar(
        "memory-timeline-swap",
        [
            serieLinha("Swap-in", pontos("entrada"), C.purple),
            serieLinha("Swap-out", pontos("saida"), C.amber)
        ],
        "Swap (MiB/s)",
        Math.max(
            1,
            ...resumo.intervalos
                .filter((p) => p.valido)
                .flatMap((p) => [p.entrada, p.saida])
        )
    );
}
