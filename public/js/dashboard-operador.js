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
function buscarQuantidadeAlertas(idNode) {
    // Utilizar o idNode para pesquisar o node
    
    return 0;
}

function abrirDash(idNode) {
    nodeSelecionado = memoriaNodes.find(node => node.id === idNode);

    document.getElementById("tituloNode").innerHTML =
        nodeSelecionado.hostname;

    const quantidadeAlertas = buscarQuantidadeAlertas(idNode);

    document.getElementById("kpiAlertasValor").innerHTML = quantidadeAlertas;

    const statusAlertas = document.getElementById("kpiAlertasStatus");
    statusAlertas.className = quantidadeAlertas === 0
        ? "operador-status normal"
        : "operador-status atencao";
    statusAlertas.innerHTML = quantidadeAlertas === 0
        ? "<span>•</span> Normal"
        : "<span>•</span> Atenção";

    mostrarDashboard();
}


const labels = [
    "15:10", "15:11", "15:12", "15:13", "15:14",
    "15:15", "15:16", "15:17", "15:18", "15:19",
    "15:20", "15:21", "15:22", "15:23", "15:24",
    "15:25", "15:26", "15:27", "15:28", "15:29",
    "15:30", "15:31", "15:32", "15:33", "15:34",
    "15:35", "15:36", "15:37", "15:38", "15:39"
];

function configurarGrafico(id, dados) {
    const canvas = document.getElementById(id);

    new Chart(canvas, {
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

configurarGrafico("graficoCpu", [
    38, 41, 44, 43, 47, 45, 48, 46, 51, 47,
    53, 55, 52, 57, 54, 58, 56, 61, 59, 64,
    67, 65, 70, 69, 73, 70, 74, 71, 76, 69.9
]);

configurarGrafico("graficoRam", [
    98, 99, 97, 100, 98, 96, 97, 94, 92, 90,
    87, 85, 87, 84, 86, 82, 84, 80, 78, 74,
    71, 74, 73, 76, 75, 78, 77, 81, 80, 79.8
]);

configurarGrafico("graficoDisco", [
    83, 82, 81, 83, 82, 85, 87, 89, 88, 90,
    88, 91, 89, 90, 92, 90, 88, 86, 85, 87,
    86, 85, 87, 84, 86, 84, 85, 84, 83, 83.4
]);

configurarGrafico("graficoSwap", [
    31, 29, 30, 27, 25, 26, 23, 22, 24, 23,
    24, 25, 27, 28, 30, 27, 29, 28, 25, 23,
    24, 22, 24, 23, 26, 25, 28, 30, 32, 30.7
]);


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
