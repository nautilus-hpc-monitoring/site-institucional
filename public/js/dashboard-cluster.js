/* Dashboard: API -> indicadores -> Chart.js. */
// CONFIGURAÇÕES — Cores, formatação e dados usados pela página.
const C = {
    grid: "#e9edf3",
    text: "#8a97ab",
    cyan: "#3783ff",
    purple: "#8957ff",
    amber: "#ff7513",
    red: "#f24b55"
};
const elemento = (id) => document.getElementById(id);
const numero = (v) => typeof v === "number" && Number.isFinite(v);
const formatar = (v) =>
    numero(v) ? v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—";
const dia = (v) => {
    const d = new Date(v?.length === 10 ? v + "T12:00:00-03:00" : v);
    return Number.isFinite(d.getTime())
        ? d.toLocaleDateString("pt-BR", {
              timeZone: "America/Sao_Paulo",
              day: "2-digit",
              month: "2-digit"
          })
        : "—";
};
const periodo = (datas) =>
    datas?.length ? dia(datas[0]) + " a " + dia(datas.at(-1)) : "Sem período disponível";
// Distingue a atualização dos dados da hora em que a página os consultou.
function formatarDataHora(valor) {
    const data = new Date(valor);
    if (!valor || !Number.isFinite(data.getTime())) return "indisponível";
    return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

const media = (valores) => {
    const validos = valores.filter(numero);
    return validos.length ? validos.reduce((a, b) => a + b, 0) / validos.length : null;
};
let catalogo = [],
    nodesClusterAtual = [],
    painel = null,
    requisicao = null,
    versao = 0,
    ultimoNodeSelecionado = null;
let nodeDiscoAtual = null,
    nodeCalorAtual = null,
    nodeConsumoAtual = null,
    recursoCalorAtual = "CPU";
let heatReadings = [],
    heatDays = [],
    consumoPorNode = {},
    memoriaPorNode = {},
    historicoPreditivo = {},
    diasPrevisao = [];
let incidentesPorNode = [],
    incidentesPrevistosPorNode = [];
const chaveNodes = elemento("sync-nodes"),
    chaveVisualizacao = elemento("heat-view-switch");

// Escreve um valor em um elemento da página.
function texto(id, valor) {
    elemento(id).textContent = valor;
}

// Limpa o gráfico e mostra uma mensagem quando faltam dados.
function semDados(id, mensagem = "Sem dados disponíveis para este período.") {
    limparGrafico(id);
    const container = elemento(id);
    container.classList.remove("chartjs-panels");
    container.classList.add("chart-empty");
    texto(id, mensagem);
}

// Remove os gráficos anteriores antes de trocar o cluster.
function limparTela() {
    Object.keys(graficosDashboard).forEach(destruirGrafico);
    [
        "disk",
        "heat",
        "expected",
        "forecast",
        "swap",
        "alerts-predicted",
        "alerts-observed"
    ].forEach((id) => semDados(id));
}

// Atualiza a mensagem de carregamento e a visibilidade da dashboard.
function estado(mensagem, ocultar = false) {
    texto("connection-status", mensagem);
    elemento("empty-state").hidden = !ocultar;
    document.querySelector(".grid").hidden = ocultar;
    document.querySelector(".kpis").hidden = ocultar;
    document.querySelector(".node-sync-controls").hidden = ocultar;
}

// Consulta a API usando o ID salvo no login.
async function api(url, signal) {
    const idUsuario = sessionStorage.getItem("ID_USUARIO");
    if (!idUsuario) {
        location.href = "./login.html";
        throw new Error("Entre novamente.");
    }
    const separador = url.includes("?") ? "&" : "?";
    const r = await fetch(
        url + separador + "idUsuario=" + encodeURIComponent(idUsuario),
        { signal, cache: "no-store" }
    );
    if (r.status === 401) {
        location.href = "./login.html";
        throw Error("Entre novamente.");
    }
    const data = await r.json();
    if (!r.ok) throw Error(data.erro || "Falha ao consultar dados.");
    return data;
}

// Preenche os seletores de HPC e cluster.
function opcoes(select, lista) {
    select.replaceChildren(...lista.map((v) => new Option(v.nome, String(v.id))));
    select.disabled = !lista.length;
}

// Mostra os clusters do HPC selecionado.
function atualizarClusters() {
    opcoes(
        elemento("cluster-select"),
        catalogo
            .filter((c) => String(c.hpc_id) === elemento("hpc-select").value)
            .map((c) => ({ id: c.cluster_id, nome: c.cluster_nome }))
    );
    carregarCluster();
}

// KPIs: nodes com incidentes, componente, duração/SLA e previstos × observados.
function cards(data) {
    const a = data.alertas,
        n = a.nodes_30min,
        c = data.componente,
        d = a.maior_atraso,
        p = a.comparacao;
    elemento("kpi-nodes").style.borderTopColor = n.quantidade > 0 ? "var(--red)" : "var(--line)";
    texto("incident-node-count", formatar(n.quantidade));
    texto("cluster-node-total", formatar(n.total_nodes));
    texto(
        "incident-node-names",
        n.hostnames.join(" · ") || "Nenhum node com alerta registrado"
    );
    texto(
        "stress-period",
        c ? "Desde segunda · até " + dia(c.fim) : "Média semanal indisponível"
    );
    texto("stress-component", c?.componente || "—");
    texto("stress-node", c?.hostname || "—");
    texto("stress-peak", formatar(c?.percentual) + (numero(c?.percentual) ? "%" : ""));
    texto("incident-duration", formatar(d.atraso_minutos));
    texto("sla-max-value", formatar(d.sla_minutos));
    texto(
        "duration-node",
        d.componente
            ? [d.componente, d.hostname].filter(Boolean).join(" · ")
            : "Sem incidente encerrado na semana"
    );
    elemento("kpi-sla").dataset.status = numero(d.atraso_minutos)
        ? d.atraso_minutos === 0
            ? "bom"
            : "ruim"
        : "neutro";
    texto(
        "sla-status",
        numero(d.atraso_minutos)
            ? d.atraso_minutos === 0
                ? "Dentro do SLA"
                : "Duração total: " + formatar(d.minutos) + " min · desde segunda"
            : d.motivo
    );
    texto("incident-expected", formatar(p.esperado));
    texto("incident-observed", formatar(p.observado));
    elemento("kpi-expected").dataset.status =
        p.variacao > 0 ? "ruim" : p.variacao < 0 ? "bom" : "neutro";
    texto("comparison-period", periodo([p.inicio, p.fim]));
    texto(
        "incident-detail",
        p.variacao === null
            ? "Sem base percentual"
            : p.variacao === 0
              ? "Sem variação"
              : (p.variacao > 0 ? "Aumento de " : "Redução de ") +
                formatar(Math.abs(p.variacao)) +
                "% nos incidentes"
    );
    incidentesPorNode = a.observados;
    incidentesPrevistosPorNode = a.previstos;
    renderizarRankingIncidentes(
        "alerts-observed",
        incidentesPorNode,
        "Incidentes observados por node"
    );
    renderizarRankingIncidentes(
        "alerts-predicted",
        incidentesPrevistosPorNode,
        "Incidentes previstos por node"
    );
}

// Localiza a telemetria do node selecionado.
function dadosNode(id) {
    return painel?.telemetria.nodes.find((n) => n.hostname === id);
}

// Cria os botões de seleção de nodes abaixo dos gráficos.
function controles(id, selecionar) {
    const container = elemento(id + "-nodes");
    container.replaceChildren();
    nodesClusterAtual.forEach((n) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = n.hostname;
        b.dataset.node = n.hostname;
        b.addEventListener("click", () => selecionarNodeDashboard(n.hostname, id));
        container.appendChild(b);
    });
}

// Destaca o botão do node selecionado.
function marcar(id, node) {
    document
        .querySelectorAll("#" + id + "-nodes button")
        .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.node === node)));
}

// GRÁFICO 1 — Confere os dados de disco e solicita o desenho.
function exibirDisco(id) {
    nodeDiscoAtual = id;
    marcar("disk", id);
    const d = dadosNode(id)?.disco;
    const descricao = [id, d ? periodo(d.datas) : "Sem telemetria de disco"];
    if (d) {
        const ultimoValor = Array.isArray(d.real) ? d.real.findLast(numero) : null;
        if (numero(ultimoValor))
            descricao.push("Atual: " + formatar(ultimoValor) + " TB");
        if (!Array.isArray(d.previsto) || !d.previsto.some(numero)) {
            descricao.push("Sem base para previsão");
        }
    }
    texto("disk-description", descricao.join(" · "));
    if (
        !d ||
        !Array.isArray(d.datas) ||
        !d.datas.length ||
        !numero(d.capacidade) ||
        d.capacidade <= 0 ||
        !Array.isArray(d.real) ||
        !Array.isArray(d.previsto) ||
        d.real.length !== d.datas.length ||
        d.previsto.length !== d.datas.length ||
        ![...d.real, ...d.previsto].some(numero)
    )
        return semDados("disk");
    renderizarDisco({ ...d, id });
}

// Define as cores do mapa: branco, verde, amarelo e vermelho.
function corDoCalor(valor) {
    if (!numero(valor)) return "#edf0f4";
    const stops = [
        { v: 0, c: [255, 255, 255] },
        { v: 35, c: [74, 184, 110] },
        { v: 65, c: [250, 204, 21] },
        { v: 100, c: [239, 68, 68] }
    ];
    const v = Math.max(0, Math.min(100, valor)),
        i = stops.findIndex((s) => s.v >= v),
        a = stops[Math.max(0, i - 1)],
        b = stops[Math.max(0, i)],
        f = b.v === a.v ? 0 : (v - a.v) / (b.v - a.v);
    return "rgb(" + a.c.map((c, j) => Math.round(c + (b.c[j] - c) * f)).join(",") + ")";
}

// Troca o node exibido no mapa de calor.
function selecionarNodeCalor(id) {
    nodeCalorAtual = id;
    marcar("heat", id);
    exibirMapaCalor(recursoCalorAtual);
}

// GRÁFICO 2 — Seleciona CPU/RAM e confere os sete dias de leituras.
function exibirMapaCalor(recurso) {
    recursoCalorAtual = recurso;
    const d = dadosNode(nodeCalorAtual)?.calor;
    document
        .querySelectorAll("[data-resource]")
        .forEach((b) =>
            b.setAttribute("aria-pressed", String(b.dataset.resource === recurso))
        );
    const desc = elemento("heat").closest("article").querySelector(".desc");
    desc.textContent =
        (nodeCalorAtual || "—") +
        " · " +
        (d ? periodo(d.dias) : "Sem telemetria horária");
    if (
        !d ||
        !Array.isArray(d.dias) ||
        d.dias.length !== 7 ||
        !Array.isArray(d.leituras) ||
        d.leituras.length !== 7 ||
        !d.leituras.every((l) => Array.isArray(l) && l.length === 24)
    )
        return semDados("heat");
    const temLeituras = d.leituras.some((linha) =>
        linha.some((leitura) => numero(leitura?.[recurso]))
    );
    if (!temLeituras) {
        return semDados(
            "heat",
            "Sem horas válidas nos sete dias anteriores. O dia atual não entra neste mapa."
        );
    }
    heatDays = d.dias.map(dia);
    heatReadings = d.leituras;
    renderizarCalor(recurso, chaveVisualizacao.checked);
}

// GRÁFICO 3 — Confere as séries de CPU/RAM real e prevista.
function exibirConsumo(id) {
    nodeConsumoAtual = id;
    marcar("expected", id);
    const d = dadosNode(id)?.consumo;
    texto(
        "expected-description",
        id + " · " + (d ? periodo(d.datas) : "Sem telemetria de CPU/RAM")
    );
    if (
        !d ||
        !Array.isArray(d.datas) ||
        d.datas.length !== 24 ||
        !["cpuObserved", "cpuExpected", "ramObserved", "ramExpected"].every(
            (c) => Array.isArray(d[c]) && d[c].length === 24
        )
    )
        return semDados("expected");
    const temHoras = ["cpuObserved", "cpuExpected", "ramObserved", "ramExpected"].some(
        (campo) => d[campo].some(numero)
    );
    if (!temHoras) {
        return semDados(
            "expected",
            "Nenhuma hora válida publicada para este dia. Aguardando horas completas com coletas suficientes."
        );
    }
    consumoPorNode[id] = d;
    renderizarConsumo(id);
}

// Lê o percentual de incidentes já calculado pela API.
function calcularFrequencia(leituras, indice) {
    const valor = leituras?.[indice];
    return numero(valor) ? { percentual: valor } : null;
}

// GRÁFICOS 4 E 5 — Atualiza incidentes e memória para os nodes escolhidos.
function exibirPrevisoes(nodes) {
    const hosts = new Set(nodes.map((n) => n.hostname));
    renderizarFrequencias(nodes.map((n) => ({ id: n.hostname })));
    const disponiveis = nodes.filter((node) => {
        const dados = memoriaPorNode[node.hostname];
        return (
            dados &&
            (dados.semSwap ||
                dados.leituras.some((leitura) => numero(leitura.swapPercent)))
        );
    });
    if (disponiveis.length)
        renderizarMemoria(disponiveis.map((n) => ({ id: n.hostname })));
    else
        semDados(
            "swap",
            "Sem ocupação de swap publicada para este período. Execute a Gold atualizada."
        );
    texto("forecast-period", periodo(diasPrevisao.map((d) => d.data)));
    const tempos = [...hosts]
        .flatMap((h) => memoriaPorNode[h]?.leituras.map((l) => l.timestamp) || [])
        .filter(numero)
        .sort((a, b) => a - b);
    texto(
        "memory-period",
        tempos.length ? periodo([tempos[0], tempos.at(-1)]) : "Sem período disponível"
    );
}
// RAM alta e swap ocupada: não depende dos contadores de paginação do Windows.
const REGRA_MEMORIA = {
    ramUsoMinimo: 90,
    swapUsoMinimo: 0,
    intervaloMaximoSegundos: 300
};

function calcularIntervalosMemoria(leituras) {
    return leituras.slice(1).map((atual, indice) => {
        const anterior = leituras[indice];
        const segundos = (atual.timestamp - anterior.timestamp) / 1000;
        const percentuais = [
            atual.ramDisponivel,
            anterior.ramDisponivel,
            atual.swapPercent,
            anterior.swapPercent
        ];
        const valido =
            segundos > 0 &&
            segundos <= REGRA_MEMORIA.intervaloMaximoSegundos &&
            percentuais.every((valor) => numero(valor) && valor >= 0 && valor <= 100);
        if (!valido) return { timestamp: atual.timestamp, valido: false, minutos: 0 };

        const ram = 100 - atual.ramDisponivel;
        const ramAnterior = 100 - anterior.ramDisponivel;
        return {
            timestamp: atual.timestamp,
            valido: true,
            minutos: segundos / 60,
            ram: ram,
            swap: atual.swapPercent,
            sinal:
                ram >= REGRA_MEMORIA.ramUsoMinimo &&
                ramAnterior >= REGRA_MEMORIA.ramUsoMinimo &&
                atual.swapPercent > REGRA_MEMORIA.swapUsoMinimo &&
                anterior.swapPercent > REGRA_MEMORIA.swapUsoMinimo
        };
    });
}

// Soma os minutos válidos com RAM alta e swap ocupada nos dois extremos do intervalo.
function resumirMemoria(dados) {
    const intervalos = calcularIntervalosMemoria(dados.leituras);
    return {
        intervalos,
        minutos: intervalos.reduce(
            (s, p) => s + (p.valido && p.sinal ? p.minutos : 0),
            0
        ),
        cobertura: intervalos.reduce((s, p) => s + p.minutos, 0)
    };
}

// Abre o histórico de RAM e swap do node clicado.
function detalharMemoria(node) {
    selecionarNodeDashboard(node, "swap");
    destruirGrafico("memory-timeline");
    const dados = memoriaPorNode[node];
    if (!dados || dados.leituras.length < 2) return;
    texto("monitor-title", node + " · RAM e swap");
    const container = elemento("monitor-content");
    container.replaceChildren();
    const p = document.createElement("p");
    p.textContent = periodo(dados.leituras.map((l) => l.timestamp));
    container.appendChild(p);
    const grafico = document.createElement("div");
    grafico.id = "memory-timeline";
    container.appendChild(grafico);
    elemento("monitor-detail").showModal();
    renderizarDetalheMemoria(node, dados, resumirMemoria(dados));
    requestAnimationFrame(() => redimensionarGraficos("memory-timeline"));
}

// Aplica a seleção a um gráfico ou a todos, conforme a chave.
function selecionarNodeDashboard(id, origem) {
    const node = nodesClusterAtual.find((n) => n.hostname === id);
    if (!node) return;
    ultimoNodeSelecionado = id;
    if (chaveNodes.checked) {
        exibirDisco(id);
        selecionarNodeCalor(id);
        exibirConsumo(id);
        exibirPrevisoes([node]);
        texto("sync-nodes-status", "Todos os gráficos: " + id);
        return;
    }
    if (origem === "disk") exibirDisco(id);
    if (origem === "heat") selecionarNodeCalor(id);
    if (origem === "expected") exibirConsumo(id);
}

// Ativa ou desativa a seleção conjunta de nodes.
function sincronizar() {
    if (chaveNodes.checked && nodesClusterAtual.length)
        selecionarNodeDashboard(ultimoNodeSelecionado || nodesClusterAtual[0].hostname);
    else {
        exibirPrevisoes(nodesClusterAtual);
        texto("sync-nodes-status", "Cada gráfico com seleção independente");
    }
}

// Seleciona o node com maior pontuação válida. Empates seguem a ordem do cadastro.
function escolherNodeCritico(calcularPontuacao) {
    let escolhido = null;
    let maiorPontuacao = -Infinity;

    for (const node of nodesClusterAtual) {
        const dados = dadosNode(node.hostname);
        const pontuacao = calcularPontuacao(dados);
        if (numero(pontuacao) && pontuacao > maiorPontuacao) {
            escolhido = node.hostname;
            maiorPontuacao = pontuacao;
        }
    }
    return escolhido;
}

// Disco: maior percentual previsto da última coleta em diante.
// Na ausência de previsão, considera a última ocupação medida.
function pontuarDisco(node) {
    const disco = node?.disco;
    if (
        !disco ||
        !numero(disco.capacidade) ||
        disco.capacidade <= 0 ||
        !Array.isArray(disco.datas) ||
        !disco.datas.length ||
        !Array.isArray(disco.real) ||
        !Array.isArray(disco.previsto) ||
        disco.real.length !== disco.datas.length ||
        disco.previsto.length !== disco.datas.length
    ) {
        return null;
    }
    const ultimaColeta = disco.real.findLastIndex(numero);
    const previstos = disco.previsto.slice(Math.max(0, ultimaColeta)).filter(numero);
    if (previstos.length) return (Math.max(...previstos) / disco.capacidade) * 100;
    return ultimaColeta >= 0 ? (disco.real[ultimaColeta] / disco.capacidade) * 100 : null;
}

// Calor: maior uso médio entre as horas válidas do recurso selecionado.
function pontuarCalor(node) {
    const calor = node?.calor;
    if (
        !calor ||
        calor.dias?.length !== 7 ||
        !Array.isArray(calor.leituras) ||
        calor.leituras.length !== 7 ||
        !calor.leituras.every((linha) => Array.isArray(linha) && linha.length === 24)
    ) {
        return null;
    }
    return media(calor.leituras.flat().map((leitura) => leitura?.[recursoCalorAtual]));
}

// Consumo: maior pico previsto restante entre CPU e RAM.
// Sem previsão restante, considera a última leitura válida de cada componente.
function pontuarConsumo(node) {
    const consumo = node?.consumo;
    const campos = ["cpuObserved", "cpuExpected", "ramObserved", "ramExpected"];
    if (
        !consumo ||
        consumo.datas?.length !== 24 ||
        !campos.every(
            (campo) => Array.isArray(consumo[campo]) && consumo[campo].length === 24
        )
    ) {
        return null;
    }
    const previstos = [];
    const atuais = [];
    for (const recurso of ["cpu", "ram"]) {
        const real = consumo[recurso + "Observed"];
        const esperado = consumo[recurso + "Expected"];
        const ultimaColeta = real.findLastIndex(numero);
        previstos.push(...esperado.slice(Math.max(0, ultimaColeta)).filter(numero));
        if (ultimaColeta >= 0) atuais.push(real[ultimaColeta]);
    }
    if (previstos.length) return Math.max(...previstos);
    return atuais.length ? Math.max(...atuais) : null;
}

// CARREGAMENTO — Busca os dados, preenche KPIs e atualiza todos os gráficos.
async function carregarCluster() {
    requisicao?.abort();
    requisicao = new AbortController();
    const atual = ++versao;
    limparTela();
    elemento("monitor-detail").close();
    ultimoNodeSelecionado = null;
    chaveNodes.disabled = true;
    const id = elemento("cluster-select").value;
    if (!id) {
        estado("Nenhum cluster disponível.", true);
        return;
    }
    estado("Carregando dados…", true);
    try {
        const data = await api(
            "/dashcluster/clusters/" + encodeURIComponent(id) + "/dados",
            requisicao.signal
        );
        if (atual !== versao) return;
        painel = data;
        nodesClusterAtual = data.nodes;
        memoriaPorNode = {};
        consumoPorNode = {};
        historicoPreditivo = {};
        data.telemetria.nodes.forEach((n) => {
            if (n.memoria && Array.isArray(n.memoria.leituras)) {
                const leituras = n.memoria.leituras
                    .map((l) => ({
                        ...l,
                        timestamp:
                            typeof l.timestamp === "number"
                                ? l.timestamp
                                : Date.parse(l.timestamp)
                    }))
                    .filter((l) => numero(l.timestamp))
                    .sort((a, b) => a.timestamp - b.timestamp);
                if (leituras.length >= 2)
                    memoriaPorNode[n.hostname] = { ...n.memoria, leituras };
            }
        });
        diasPrevisao = (data.alertas.frequencias[0]?.dias || []).map((d, i) => ({
            data: d.data,
            label: dia(d.data),
            indice: i
        }));
        data.alertas.frequencias.forEach((n) => {
            historicoPreditivo[n.hostname] = { alertas: n.dias.map((d) => d.percentual) };
        });
        cards(data);
        ["disk", "heat", "expected"].forEach((id) => controles(id));
        estado(data.avisos.length ? data.avisos.join(" ") : "Dados do banco e S3");
        texto("cluster-description", data.cluster.cluster_nome);
        texto(
            "cluster-summary",
            nodesClusterAtual.length +
                (nodesClusterAtual.length === 1 ? " node" : " nodes")
        );
        const dataColeta = data.telemetria.metadados?.telemetria_ate;
        texto(
            "data-time",
            "Coleta: " +
                formatarDataHora(dataColeta) +
                " · Consulta: " +
                formatarDataHora(data.gerado_em)
        );
        const primeiro = nodesClusterAtual[0]?.hostname;
        if (primeiro) {
            const nodeDisco = escolherNodeCritico(pontuarDisco) || primeiro;
            const nodeCalor = escolherNodeCritico(pontuarCalor) || primeiro;
            const nodeConsumo = escolherNodeCritico(pontuarConsumo) || primeiro;
            exibirDisco(nodeDisco);
            selecionarNodeCalor(nodeCalor);
            exibirConsumo(nodeConsumo);
            ultimoNodeSelecionado = nodeDisco;
            chaveNodes.disabled = false;
        }
        sincronizar();
        requestAnimationFrame(() =>
            Object.values(graficosDashboard).forEach((g) => g.resize())
        );
    } catch (e) {
        if (e.name !== "AbortError" && atual === versao) {
            limparTela();
            estado(e.message, true);
        }
    }
}

// Abre e fecha o detalhamento dos incidentes previstos ou observados.
function configurarPreview(tipo) {
    const anchor = elemento(tipo + "-preview"),
        trigger = elemento(tipo + "-trigger"),
        panel = elemento(tipo + "-panel");
    trigger.addEventListener("click", () => {
        panel.hidden = !panel.hidden;
        trigger.setAttribute("aria-expanded", String(!panel.hidden));
        if (!panel.hidden)
            requestAnimationFrame(() => redimensionarGraficos("alerts-" + tipo));
    });
    anchor.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            panel.hidden = true;
            trigger.setAttribute("aria-expanded", "false");
        }
    });
}
// EVENTOS — Cliques, seletores, chave de nodes e abertura de detalhes.
configurarPreview("predicted");
configurarPreview("observed");
chaveNodes.addEventListener("change", sincronizar);
chaveVisualizacao.addEventListener("change", () => exibirMapaCalor(recursoCalorAtual));
document
    .querySelectorAll("[data-resource]")
    .forEach((b) =>
        b.addEventListener("click", () => exibirMapaCalor(b.dataset.resource))
    );
elemento("monitor-close").addEventListener("click", () =>
    elemento("monitor-detail").close()
);
elemento("monitor-detail").addEventListener("close", () =>
    destruirGrafico("memory-timeline")
);
elemento("hpc-select").addEventListener("change", atualizarClusters);
elemento("cluster-select").addEventListener("change", carregarCluster);
elemento("restore-cluster").addEventListener("click", () =>
    catalogo.length ? carregarCluster() : iniciar()
);

// INÍCIO — Busca os HPCs e clusters disponíveis ao abrir a página.
async function iniciar() {
    estado("Carregando ambientes…", true);
    try {
        catalogo = await api("/dashcluster/clusters");
        const ambientes = [
            ...new Map(
                catalogo.map((c) => [c.hpc_id, { id: c.hpc_id, nome: c.hpc_nome }])
            ).values()
        ];
        opcoes(elemento("hpc-select"), ambientes);
        atualizarClusters();
    } catch (e) {
        estado(e.message, true);
    }
}
iniciar();
