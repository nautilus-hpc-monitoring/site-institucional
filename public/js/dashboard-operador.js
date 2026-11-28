if (typeof Chart !== "undefined") {
    const estilo = getComputedStyle(document.body);
    Chart.defaults.font.family = estilo.fontFamily;
    Chart.defaults.font.size = Number.parseFloat(estilo.getPropertyValue("--dashboard-fonte-pequena")) || 14;
}

if (sessionStorage.NOME_USUARIO) {
    document.getElementById("b_usuario").innerHTML = sessionStorage.NOME_USUARIO;
}

const fkEmpresaUsuario = sessionStorage.ID_EMPRESA;
const htmlSeletor = document.getElementById("seletor");
const htmlListaSeletor = document.getElementById("lista-seletor");
const htmlBusca = document.getElementById("ipt-busca-seletor");
const htmlTituloSeletor = document.getElementById("titulo-seletor");
const htmlSubtituloSeletor = document.getElementById("subtitulo-seletor");
const htmlVoltarSeletor = document.getElementById("btn-voltar-seletor");
const htmlDashboard = document.getElementById("dashboard");
const htmlKpisSeletor = document.getElementById("kpis-seletor");
const mobileSidebar = document.getElementById("mobileSidebar");

let kpisCampeoes = [];
let memoriaHPCs = [];
let hpcSelecionado = null;
let memoriaClusters = [];
let clusterSelecionado = null;
let memoriaNodes = [];
let nodeSelecionado = null;
let nivelSeletor = "hpc";
let painelTelemetria = null;
let sequenciaTelemetria = 0;
let controladorTelemetria = null;

window.onload = function () {
    validarSessao();
    listarHPC();
};

function chamarAPI(rota, dados) {
    return fetch("/hpc/" + rota, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dados || {})
    });
}

function formatarStatus(status) {
    return status === "manut." || status === "manut"
        ? "manutenção"
        : status;
}

function classeStatus(status) {
    if (status === "manut." || status === "manut") {
        return "badge-manut";
    }

    return status === "ativo"
        ? "badge-ativo"
        : "badge-inativo";
}

function normalizarTexto(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function filtrarLista(lista, campos) {
    const termo = normalizarTexto(htmlBusca.value.trim());

    if (!termo) {
        return lista;
    }

    return lista.filter(item =>
        campos.some(campo => normalizarTexto(item[campo]).includes(termo))
    );
}

function redesenharSeletor() {
    if (nivelSeletor === "node") {
        desenharTabelaNodes(memoriaNodes);
    } else if (nivelSeletor === "cluster") {
        desenharTabelaClusters(memoriaClusters);
    } else {
        desenharTabelaHPC(memoriaHPCs);
    }
}

function definirCabecalho(titulo, subtitulo, mostrarVoltar) {
    htmlTituloSeletor.textContent = titulo;
    htmlSubtituloSeletor.textContent = subtitulo;
    htmlVoltarSeletor.classList.toggle("none", !mostrarVoltar);
}

async function buscarCampeoes() {
    const idUsuario = sessionStorage.getItem("ID_USUARIO");
    if (!idUsuario) {
        return;
    }

    try {
        const resposta = await fetch(
            "/dashoperador/campeoes?idUsuario=" + encodeURIComponent(idUsuario),
            { cache: "no-store" }
        );

        if (resposta.status === 401) {
            location.href = "./login.html";
            return;
        }

        const dados = await resposta.json();
        if (!resposta.ok) {
            throw new Error(dados.erro || "Não foi possível carregar os campeões.");
        }

        kpisCampeoes = Object.values(dados.campeoes || {});
        desenharKpisSeletor();
    } catch (erro) {
        kpisCampeoes = [];
        desenharKpisSeletor();
        console.error(erro);
    }
}

function desenharKpisSeletor() {
    for (const chave of ["cpu", "ram", "disco", "alertas"]) {
        const kpi = kpisCampeoes.find(item => item && item.chave === chave);
        const sufixo = chave.charAt(0).toUpperCase() + chave.slice(1);
        const valor = document.getElementById("kpiTop" + sufixo + "Valor");
        const node = document.getElementById("kpiTop" + sufixo + "Node");
        const status = document.getElementById("kpiTop" + sufixo + "Status");

        if (!valor || !node || !status) {
            continue;
        }

        const temDado = Boolean(kpi && kpi.hostname && kpi.valor !== null);
        valor.textContent = temDado
            ? (chave === "alertas" ? String(kpi.valor) : Number(kpi.valor).toFixed(1))
            : "—";
        node.textContent = temDado ? kpi.hostname : "Sem dados";
        definirStatus(
            status.id,
            temDado ? kpi.status : "normal",
            temDado ? (kpi.status === "atencao" ? "Atenção" : "Normal") : "Sem dados"
        );
    }
}

async function abrirNodeCampeao(chave) {
    const kpi = kpisCampeoes.find(item => item && item.chave === chave);
    if (!kpi || !kpi.hpcId || !kpi.clusterId || !kpi.nodeId) {
        return;
    }

    await listarClusters(kpi.hpcId);

    const cluster = memoriaClusters.find(item => item.id === kpi.clusterId);
    if (!cluster) {
        return;
    }

    await listarNodes(kpi.clusterId);

    const node = memoriaNodes.find(item => item.id === kpi.nodeId)
        || memoriaNodes.find(item => item.hostname === kpi.hostname);
    if (!node) {
        return;
    }

    await abrirDash(node.id);
}

function voltarSeletor() {
    if (nivelSeletor === "node") {
        listarClusters(hpcSelecionado.id);
    } else if (nivelSeletor === "cluster") {
        listarHPC();
    }
}

function mostrarSeletor() {
    sequenciaTelemetria++;
    if (controladorTelemetria) {
        controladorTelemetria.abort();
        controladorTelemetria = null;
    }

    htmlSeletor.classList.remove("none");
    htmlDashboard.classList.add("none");
}

function mostrarDashboard() {
    htmlSeletor.classList.add("none");
    htmlDashboard.classList.remove("none");

    requestAnimationFrame(() => {
        Chart.getChart("graficoCpu")?.resize();
        Chart.getChart("graficoRam")?.resize();
        Chart.getChart("graficoDisco")?.resize();
        Chart.getChart("graficoSwap")?.resize();
    });
}

// AMBIENTES HPC

function listarHPC() {
    mostrarSeletor();
    htmlKpisSeletor.classList.remove("none");
    buscarCampeoes();

    htmlBusca.value = "";
    nivelSeletor = "hpc";
    hpcSelecionado = null;
    clusterSelecionado = null;
    nodeSelecionado = null;

    chamarAPI("listarHPC", {
        empresaServer: fkEmpresaUsuario
    })
        .then(resposta => {
            if (!resposta.ok) {
                throw new Error("Erro ao listar ambientes HPC.");
            }

            return resposta.json();
        })
        .then(lista => {
            memoriaHPCs = lista;
            desenharTabelaHPC(lista);
        })
        .catch(erro => console.log(erro));
}

function desenharTabelaHPC(lista) {
    const visiveis = filtrarLista(lista, ["nome", "localizacao"]);
    const buscando = htmlBusca.value.trim() !== "";

    htmlBusca.placeholder = "Buscar ambientes HPC...";
    definirCabecalho(
        "Ambientes HPC",
        "Selecione um ambiente para visualizar seus clusters",
        false
    );

    let html = `
        <div class="panel-card">
            <div class="tabela-wrap">
                <table class="tabela">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Localização</th>
                            <th>Clusters</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    if (visiveis.length === 0) {
        html += `
            <tr>
                <td colspan="4" class="vazio">
                    ${buscando ? "Nenhum ambiente HPC encontrado para a busca." : "Nenhum ambiente HPC encontrado."}
                </td>
            </tr>
        `;
    } else {
        for (let hpc of visiveis) {
            html += `
                <tr class="clicavel"
                    onclick="listarClusters(${hpc.id})">

                    <td><strong>${hpc.nome}</strong></td>
                    <td>${hpc.localizacao || "-"}</td>
                    <td>${hpc.totalClusters || 0}</td>

                    <td>
                        <span class="badge ${classeStatus(hpc.status)}">
                            ${formatarStatus(hpc.status)}
                        </span>
                    </td>
                </tr>
            `;
        }
    }

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    htmlListaSeletor.innerHTML = html;
}

// CLUSTERS

function listarClusters(idHpc) {
    htmlKpisSeletor.classList.add("none");
    htmlBusca.value = "";
    nivelSeletor = "cluster";
    hpcSelecionado = memoriaHPCs.find(h => h.id === idHpc);

    if (!hpcSelecionado) {
        return Promise.resolve();
    }

    return chamarAPI("listarClusters", {
        idHpcServer: idHpc
    })
        .then(resposta => {
            if (!resposta.ok) {
                throw new Error("Erro ao listar clusters.");
            }

            return resposta.json();
        })
        .then(lista => {
            memoriaClusters = lista;
            desenharTabelaClusters(lista);
            mostrarSeletor();
        })
        .catch(erro => console.log(erro));
}

function desenharTabelaClusters(lista) {
    const visiveis = filtrarLista(lista, ["nome"]);
    const buscando = htmlBusca.value.trim() !== "";

    htmlBusca.placeholder = "Buscar clusters...";
    definirCabecalho(
        "Clusters de: " + hpcSelecionado.nome,
        "Selecione um cluster para visualizar seus nodes",
        true
    );

    let html = `
        <div class="panel-card">
            <div class="tabela-wrap">
                <table class="tabela">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Total de Nodes</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    if (visiveis.length === 0) {
        html += `
            <tr>
                <td colspan="3" class="vazio">
                    ${buscando ? "Nenhum cluster encontrado para a busca." : "Nenhum cluster encontrado."}
                </td>
            </tr>
        `;
    } else {
        for (let cluster of visiveis) {
            html += `
                <tr class="clicavel"
                    onclick="listarNodes(${cluster.id})">

                    <td><strong>${cluster.nome}</strong></td>
                    <td>${cluster.totalNodes || 0}</td>

                    <td>
                        <span class="badge ${classeStatus(cluster.status)}">
                            ${formatarStatus(cluster.status)}
                        </span>
                    </td>
                </tr>
            `;
        }
    }

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    htmlListaSeletor.innerHTML = html;
}

// NODES

function listarNodes(idCluster) {
    htmlKpisSeletor.classList.add("none");
    htmlBusca.value = "";
    nivelSeletor = "node";
    clusterSelecionado = memoriaClusters.find(c => c.id === idCluster);

    if (!clusterSelecionado) {
        return Promise.resolve();
    }

    return chamarAPI("listarNodes", {
        idClusterServer: idCluster
    })
        .then(resposta => {
            if (!resposta.ok) {
                throw new Error("Erro ao listar nodes.");
            }

            return resposta.json();
        })
        .then(lista => {
            memoriaNodes = lista;
            desenharTabelaNodes(lista);
            mostrarSeletor();
        })
        .catch(erro => console.log(erro));
}

function desenharTabelaNodes(lista) {
    const visiveis = filtrarLista(lista, ["hostname", "ip", "sistemaOperacional"]);
    const buscando = htmlBusca.value.trim() !== "";

    htmlBusca.placeholder = "Buscar nodes...";
    definirCabecalho(
        "Nodes de: " + clusterSelecionado.nome,
        "Selecione um node para acessar o monitoramento",
        true
    );

    let html = `
        <div class="panel-card">
            <div class="tabela-wrap">
                <table class="tabela">
                    <thead>
                        <tr>
                            <th>Hostname</th>
                            <th>SO</th>
                            <th>IP</th>
                            <th>Componentes</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    if (visiveis.length === 0) {
        html += `
            <tr>
                <td colspan="5" class="vazio">
                    ${buscando ? "Nenhum node encontrado para a busca." : "Nenhum node encontrado."}
                </td>
            </tr>
        `;
    } else {
        for (let node of visiveis) {
            html += `
                <tr class="clicavel"
                    onclick="abrirDash(${node.id})">

                    <td><strong>${node.hostname}</strong></td>
                    <td>${node.sistemaOperacional}</td>
                    <td>${node.ip}</td>
                    <td>${node.componentes || "Nenhum"}</td>

                    <td>
                        <span class="badge ${classeStatus(node.status)}">
                            ${formatarStatus(node.status)}
                        </span>
                    </td>
                </tr>
            `;
        }
    }

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    htmlListaSeletor.innerHTML = html;
}

// DASHBOARD DO NODE

function numeroPercentual(valor) {
    if (typeof valor !== "number" && (typeof valor !== "string" || !valor.trim())) return null;
    const numero = Number(valor);
    return Number.isFinite(numero) && numero >= 0 && numero <= 100 ? numero : null;
}

function ultimoValor(lista) {
    if (!Array.isArray(lista)) return null;

    for (let indice = lista.length - 1; indice >= 0; indice--) {
        const valor = numeroPercentual(lista[indice]);
        if (valor !== null) return valor;
    }

    return null;
}

function formatarHora(valor, incluirData = false) {
    if (valor === null || valor === undefined || valor === "") return "";

    const data = new Date(valor);
    if (Number.isFinite(data.getTime())) {
        return new Intl.DateTimeFormat("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Sao_Paulo",
            ...(incluirData ? { day: "2-digit", month: "2-digit" } : {})
        }).format(data);
    }

    const texto = String(valor);
    return /^\d{2}:\d{2}/.test(texto.slice(11)) ? texto.slice(11, 16) : texto;
}

function definirGrafico(id, labels, dados, limites) {
    const atencao = numeroPercentual(limites?.atencao);
    const critico = numeroPercentual(limites?.critico);
    const temLimites = atencao !== null && critico !== null && critico > atencao;

    const datasets = [{
        label: "Uso",
        data: dados,
        borderColor: "#42B8C4",
        borderWidth: 2,
        backgroundColor: "transparent",
        pointRadius: 2,
        pointHoverRadius: 4,
        spanGaps: false,
        tension: 0.35
    }];

    if (temLimites) {
        datasets.push({
            label: "Alerta",
            data: labels.map(() => atencao),
            borderColor: "#F59E0B",
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            spanGaps: true,
            tension: 0
        });
        datasets.push({
            label: "Crítico",
            data: labels.map(() => critico),
            borderColor: "#DC2626",
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            spanGaps: true,
            tension: 0
        });
    }

    const existente = Chart.getChart(id);
    if (existente) {
        existente.data.labels = labels;
        existente.data.datasets = datasets;
        existente.options.plugins.legend.display = temLimites;
        existente.update();
        return;
    }

    new Chart(document.getElementById(id), {
        type: "line",
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: {
                    display: temLimites,
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8,
                        color: "#64748B",
                        filter: function (item) {
                            return item.text !== "Uso";
                        }
                    }
                },
                tooltip: {
                    enabled: true,
                    filter: function (item) {
                        return item.dataset.label === "Uso";
                    },
                    callbacks: {
                        label: function (context) {
                            return context.parsed.y + "%";
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: "#94A3B8",
                        maxTicksLimit: 8,
                        maxRotation: 0
                    }
                },
                y: {
                    min: 0,
                    max: 100,
                    ticks: {
                        stepSize: 25,
                        color: "#94A3B8"
                    },
                    grid: {
                        color: "#F1F5F9",
                        borderDash: [3, 3]
                    },
                    border: {
                        display: false
                    }
                }
            }
        }
    });
}

function definirStatus(id, situacao, texto) {
    const elemento = document.getElementById(id);
    elemento.className = "operador-status " + situacao;
    elemento.innerHTML = "<span>•</span> " + texto;
}

function definirKpi(valorId, statusId, valor, limite) {
    document.getElementById(valorId).textContent = valor === null ? "—" : valor.toFixed(1);

    if (valor === null) {
        definirStatus(statusId, "neutro", "Sem dados");
        return;
    }

    const atencao = numeroPercentual(limite?.atencao);
    const critico = numeroPercentual(limite?.critico);
    if (atencao === null || critico === null || critico <= atencao) {
        definirStatus(statusId, "neutro", "Sem referência");
    } else if (valor >= critico) {
        definirStatus(statusId, "critico", "Crítico");
    } else if (valor >= atencao) {
        definirStatus(statusId, "atencao", "Atenção");
    } else {
        definirStatus(statusId, "normal", "Normal");
    }
}

function definirRodapes(periodos, coleta) {
    document.querySelectorAll("#dashboard .operador-grafico-footer").forEach((rodape, indice) => {
        rodape.querySelector("span").textContent = periodos[indice];
        rodape.querySelector("span:last-child").textContent = coleta
            ? "Coleta: " + formatarHora(coleta, true)
            : "Sem coleta informada";
    });
}

function definirAviso(mensagens) {
    const aviso = document.getElementById("avisoTelemetria");
    const filtradas = [...new Set(mensagens.filter(Boolean))];
    aviso.hidden = filtradas.length === 0;
    aviso.textContent = filtradas.join(" ");
}

function limparKpisEgraficos() {
    [
        "kpiCpuValor", "kpiRamValor", "kpiDiscoValor", "kpiAlertasValor",
        "valorGraficoCpu", "valorGraficoRam", "valorGraficoDisco", "valorGraficoSwap"
    ].forEach(id => {
        document.getElementById(id).textContent = "—";
    });

    ["kpiCpuStatus", "kpiRamStatus", "kpiDiscoStatus", "kpiAlertasStatus"].forEach(id => {
        definirStatus(id, "neutro", "Carregando");
    });

    ["graficoCpu", "graficoRam", "graficoDisco", "graficoSwap"].forEach(id => {
        definirGrafico(id, [], []);
    });

    definirRodapes(["Últimas 24 h", "Últimas 24 h", "Últimas 24 h", "Últimas 24 h"], null);
}

function aplicarTelemetria(erro) {
    const atual = painelTelemetria?.telemetria;
    const legado = painelTelemetria?.legado;
    const datas = atual?.datas || legado?.consumo?.datas || [];
    const labels = datas.map(data => formatarHora(data));
    const periodos = [];

    for (const [recurso, sufixo, nomeMedia, chaveConsumo] of [
        ["CPU", "Cpu", "CPU", "cpuObserved"],
        ["RAM", "Ram", "RAM", "ramObserved"],
        ["DISCO", "Disco", "Disco"],
        ["SWAP", "Swap", "Swap"],
    ]) {
        const serie = atual?.series?.[recurso] || legado?.consumo?.[chaveConsumo] || [];
        const dados = serie.map(numeroPercentual);
        const valorHorario = legado ? ultimoValor(dados) : null;
        const valor = atual
            ? numeroPercentual(atual.valores?.[recurso])
            : valorHorario ?? numeroPercentual(legado?.medias?.[nomeMedia]);

        if (recurso !== "SWAP") {
            definirKpi("kpi" + sufixo + "Valor", "kpi" + sufixo + "Status",
                valor, painelTelemetria?.limites?.[recurso]);
        }
        document.getElementById("valorGrafico" + sufixo).textContent =
            valor === null ? "—" : valor.toFixed(1);
        definirGrafico("grafico" + sufixo, dados.length ? labels : [], dados, painelTelemetria?.limites?.[recurso]);
        periodos.push(atual ? "Últimas 24 h · médias por hora"
            : valorHorario !== null ? "Dia publicado · médias por hora"
            : valor !== null ? "Destaque · média semanal" : "Sem série disponível");
    }

    const quantidadeAlertas = painelTelemetria?.quantidade_alertas ?? null;
    document.getElementById("kpiAlertasValor").textContent =
        quantidadeAlertas === null ? "—" : String(quantidadeAlertas);
    definirStatus(
        "kpiAlertasStatus",
        quantidadeAlertas === null ? "neutro" : quantidadeAlertas > 0 ? "atencao" : "normal",
        quantidadeAlertas === null ? "Sem dados" : quantidadeAlertas > 0 ? "Atenção" : "Normal"
    );

    definirRodapes(periodos, atual?.ultima_coleta || legado?.fim);
    definirAviso([...(painelTelemetria?.avisos || []), erro]);
}

async function buscarPainelDoNode(idNode, signal) {
    const idUsuario = sessionStorage.getItem("ID_USUARIO");
    if (!idUsuario) {
        location.href = "./login.html";
        throw new Error("Entre novamente.");
    }

    const resposta = await fetch(
        "/dashoperador/nodes/" + encodeURIComponent(idNode) +
            "/dados?idUsuario=" + encodeURIComponent(idUsuario),
        { signal: signal, cache: "no-store" }
    );

    if (resposta.status === 401) {
        location.href = "./login.html";
        throw new Error("Entre novamente.");
    }

    const dados = await resposta.json();
    if (!resposta.ok) {
        throw new Error(dados.erro || "Não foi possível carregar a telemetria do node.");
    }

    return dados;
}

async function abrirDash(idNode) {
    nodeSelecionado = memoriaNodes.find(node => node.id === idNode);
    if (!nodeSelecionado || !clusterSelecionado) return;

    document.getElementById("tituloNode").textContent = nodeSelecionado.hostname;
    definirAviso(["Carregando telemetria do S3..."]);
    limparKpisEgraficos();
    mostrarDashboard();

    const sequencia = ++sequenciaTelemetria;
    if (controladorTelemetria) controladorTelemetria.abort();
    controladorTelemetria = new AbortController();

    try {
        const painel = await buscarPainelDoNode(
            nodeSelecionado.id,
            controladorTelemetria.signal
        );
        if (sequencia !== sequenciaTelemetria) return;

        painelTelemetria = painel;
        aplicarTelemetria();
    } catch (erro) {
        if (erro.name === "AbortError" || sequencia !== sequenciaTelemetria) return;

        painelTelemetria = null;
        aplicarTelemetria(erro.message);
    } finally {
        if (sequencia === sequenciaTelemetria) controladorTelemetria = null;
    }
}


// SIDEBAR MOBILE

document.getElementById("open-sidebar-btn").onclick = function () {
    mobileSidebar.classList.add("active");
    document.getElementById("sidebar-overlay").classList.add("active");
};

document.getElementById("close-sidebar-btn").onclick = function () {
    mobileSidebar.classList.remove("active");
    document.getElementById("sidebar-overlay").classList.remove("active");
};

document.getElementById("sidebar-overlay").onclick = function () {
    mobileSidebar.classList.remove("active");
    document.getElementById("sidebar-overlay").classList.remove("active");
};

htmlBusca.addEventListener("input", redesenharSeletor);
