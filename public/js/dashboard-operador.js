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
const mobileSidebar = document.getElementById("mobileSidebar");

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
    htmlBusca.value = "";
    nivelSeletor = "cluster";
    hpcSelecionado = memoriaHPCs.find(h => h.id === idHpc);

    if (!hpcSelecionado) {
        return;
    }

    chamarAPI("listarClusters", {
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
    htmlBusca.value = "";
    nivelSeletor = "node";
    clusterSelecionado = memoriaClusters.find(c => c.id === idCluster);

    if (!clusterSelecionado) {
        return;
    }

    chamarAPI("listarNodes", {
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
    const numero = typeof valor === "string" && valor.trim() === "" ? NaN : Number(valor);
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

function formatarHora(valor) {
    if (valor === null || valor === undefined || valor === "") return "";

    const data = new Date(valor);
    if (Number.isFinite(data.getTime())) {
        return new Intl.DateTimeFormat("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Sao_Paulo"
        }).format(data);
    }

    const texto = String(valor);
    return /^\d{2}:\d{2}/.test(texto.slice(11)) ? texto.slice(11, 16) : texto;
}

function mediasValidas(nodeTelemetria) {
    const resumo = nodeTelemetria?.medias_semana;
    if (!resumo || !resumo.valores) return null;

    const inicio = Date.parse(resumo.inicio);
    const fim = Date.parse(resumo.fim);
    if (!Number.isFinite(inicio) || !Number.isFinite(fim) || inicio > fim || fim > Date.now()) {
        return null;
    }

    return resumo.valores;
}

function dadosDoNode() {
    if (!painelTelemetria || !nodeSelecionado) return null;

    return painelTelemetria.telemetria?.nodes?.find(
        node => node.hostname === nodeSelecionado.hostname
    ) || null;
}

function serieDoConsumo(nodeTelemetria) {
    const consumo = nodeTelemetria?.consumo;
    if (!consumo || !Array.isArray(consumo.datas) || consumo.datas.length === 0) return null;

    const cpu = Array.isArray(consumo.cpuObserved) ? consumo.cpuObserved : [];
    const ram = Array.isArray(consumo.ramObserved) ? consumo.ramObserved : [];
    if (!cpu.some(numeroPercentual) && !ram.some(numeroPercentual)) return null;

    return {
        labels: consumo.datas.map(formatarHora),
        cpu: consumo.datas.map((_, indice) => numeroPercentual(cpu[indice])),
        ram: consumo.datas.map((_, indice) => numeroPercentual(ram[indice]))
    };
}

function serieDoCalor(nodeTelemetria, componente) {
    const calor = nodeTelemetria?.calor;
    if (!calor || !Array.isArray(calor.leituras) || calor.leituras.length === 0) return null;

    const ultimaLinha = calor.leituras[calor.leituras.length - 1];
    if (!Array.isArray(ultimaLinha) || ultimaLinha.length === 0) return null;

    const chave = Object.keys(ultimaLinha[0] || {}).find(
        nome => nome.toUpperCase() === componente.toUpperCase()
    );
    if (!chave) return null;

    const dados = ultimaLinha.map(leitura => numeroPercentual(leitura?.[chave]));
    if (!dados.some(valor => valor !== null)) return null;

    return {
        labels: dados.map((_, indice) => String(indice).padStart(2, "0") + ":00"),
        dados: dados
    };
}

function serieDaMedia(valor, tamanho) {
    if (valor === null) return [];
    return Array.from({ length: tamanho }, () => valor);
}

function definirGrafico(id, labels, dados) {
    const existente = Chart.getChart(id);
    if (existente) {
        existente.data.labels = labels;
        existente.data.datasets[0].data = dados;
        existente.update();
        return;
    }

    new Chart(document.getElementById(id), {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                data: dados,
                borderColor: "#42B8C4",
                borderWidth: 2,
                backgroundColor: "transparent",
                pointRadius: 0,
                pointHoverRadius: 4,
                tension: 0.35
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
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
                        font: {
                            family: "Exo 2",
                            size: 10
                        }
                    }
                },
                y: {
                    min: 0,
                    max: 100,
                    ticks: {
                        stepSize: 25,
                        color: "#94A3B8",
                        font: {
                            family: "Exo 2",
                            size: 10
                        }
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
    elemento.className = "operador-status " + (situacao === "atencao" ? "atencao" : "normal");
    elemento.innerHTML = "<span>•</span> " + texto;
}

function situacaoDoComponente(componente, hostname, nome) {
    if (!componente || componente.hostname !== hostname) return null;
    if (String(componente.componente || "").toUpperCase() !== nome.toUpperCase()) return null;

    const situacao = String(componente.status_uso || "").toLowerCase();
    if (["atencao", "alerta", "ruim"].includes(situacao)) return "atencao";
    if (situacao === "bom") return "normal";
    return null;
}

function definirKpi(valorId, statusId, valor, situacao) {
    document.getElementById(valorId).textContent = valor === null ? "—" : valor.toFixed(1);

    if (!situacao) {
        definirStatus(statusId, "normal", "Sem referência");
        return;
    }

    definirStatus(statusId, situacao, situacao === "atencao" ? "Atenção" : "Normal");
}

function definirRodapes(periodos, painel) {
    const coleta = painel?.telemetria?.metadados?.telemetria_ate;

    document.querySelectorAll("#dashboard .operador-grafico-footer").forEach((rodape, indice) => {
        rodape.querySelector("span").textContent = periodos[indice];
        rodape.querySelector("span:last-child").textContent = coleta
            ? "Coleta: " + formatarHora(coleta)
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
        definirStatus(id, "normal", "Carregando");
    });

    ["graficoCpu", "graficoRam", "graficoDisco", "graficoSwap"].forEach(id => {
        definirGrafico(id, [], []);
    });

    definirRodapes(["Últimas 24 h", "Últimas 24 h", "Últimas 24 h", "Últimas 24 h"], null);
}

function quantidadeAlertasDoNode(painel, hostname) {
    const observado = painel?.alertas?.observados?.find(item => item.node === hostname);
    if (!observado) return 0;
    return (Number(observado.criticos) || 0) + (Number(observado.atencao) || 0);
}

function aplicarTelemetria(erro) {
    const painel = painelTelemetria;
    const hostname = nodeSelecionado?.hostname;
    const node = dadosDoNode();
    const medias = mediasValidas(node);
    const serie = serieDoConsumo(node);
    const serieDisco = serieDoCalor(node, "Disco");
    const serieSwap = serieDoCalor(node, "Swap");
    const componente = painel?.componente;
    const labelsPadrao = serie?.labels.length
        ? serie.labels
        : Array.from({ length: 24 }, (_, indice) => String(indice).padStart(2, "0") + ":00");

    const avisos = painel?.avisos ? painel.avisos.slice() : [];
    if (erro) avisos.push(erro);
    if (!node) avisos.push("Nenhuma telemetria publicada para este node no S3.");

    const cpu = serie ? ultimoValor(serie.cpu) : numeroPercentual(medias?.CPU);
    const ram = serie ? ultimoValor(serie.ram) : numeroPercentual(medias?.RAM);
    const disco = numeroPercentual(medias?.Disco);
    const swap = numeroPercentual(medias?.Swap);
    const situacaoCpu = situacaoDoComponente(componente, hostname, "CPU");
    const situacaoRam = situacaoDoComponente(componente, hostname, "RAM");
    const situacaoDisco = situacaoDoComponente(componente, hostname, "Disco");

    definirKpi("kpiCpuValor", "kpiCpuStatus", cpu, situacaoCpu);
    definirKpi("kpiRamValor", "kpiRamStatus", ram, situacaoRam);
    definirKpi("kpiDiscoValor", "kpiDiscoStatus", disco, situacaoDisco);

    document.getElementById("valorGraficoCpu").textContent = cpu === null ? "—" : cpu.toFixed(1);
    document.getElementById("valorGraficoRam").textContent = ram === null ? "—" : ram.toFixed(1);
    document.getElementById("valorGraficoDisco").textContent = disco === null ? "—" : disco.toFixed(1);
    document.getElementById("valorGraficoSwap").textContent = swap === null ? "—" : swap.toFixed(1);

    const quantidadeAlertas = painel ? quantidadeAlertasDoNode(painel, hostname) : null;
    document.getElementById("kpiAlertasValor").textContent =
        quantidadeAlertas === null ? "—" : String(quantidadeAlertas);
    definirStatus(
        "kpiAlertasStatus",
        quantidadeAlertas > 0 ? "atencao" : "normal",
        quantidadeAlertas === null ? "Sem dados" : quantidadeAlertas > 0 ? "Atenção" : "Normal"
    );

    definirGrafico("graficoCpu", labelsPadrao, serie ? serie.cpu : []);
    definirGrafico("graficoRam", labelsPadrao, serie ? serie.ram : []);
    definirGrafico(
        "graficoDisco",
        serieDisco ? serieDisco.labels : labelsPadrao,
        serieDisco ? serieDisco.dados : serieDaMedia(disco, labelsPadrao.length)
    );
    definirGrafico(
        "graficoSwap",
        serieSwap ? serieSwap.labels : labelsPadrao,
        serieSwap ? serieSwap.dados : serieDaMedia(swap, labelsPadrao.length)
    );

    definirRodapes([
        "Últimas 24 h",
        "Últimas 24 h",
        serieDisco ? "Últimas 24 h" : "Média semanal",
        serieSwap ? "Últimas 24 h" : "Média semanal"
    ], painel);

    definirAviso(avisos);
}

async function buscarPainelDoCluster(idCluster, signal) {
    const idUsuario = sessionStorage.getItem("ID_USUARIO");
    if (!idUsuario) {
        location.href = "./login.html";
        throw new Error("Entre novamente.");
    }

    const resposta = await fetch(
        "/dashcluster/clusters/" + encodeURIComponent(idCluster) +
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
        const painel = await buscarPainelDoCluster(
            clusterSelecionado.id,
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
