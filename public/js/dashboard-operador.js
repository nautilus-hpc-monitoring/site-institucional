 if (sessionStorage.NOME_USUARIO) {
    document.getElementById("b_usuario").innerHTML = sessionStorage.NOME_USUARIO;
}


const htmlAmbientes = document.getElementById("ambientes");
    const htmlAmbientesitens = document.getElementById("ambientes_itens");
    const htmlClusters = document.getElementById("clusters");
    const htmlClusteritens = document.getElementById("cluster_itens");
    const htmlNodes = document.getElementById("nodes");
    const htmlNodesItens = document.getElementById("node_itens");
    const htmlDashboard = document.getElementById("dashboard");
    const mobileSidebar = document.getElementById("mobileSidebar");

    const ambientes = [
        {
            id_ambiente_hpc: 1,
            nome: "Petrobrás 1",
            status: "ativo"
        },
        {
            id_ambiente_hpc: 2,
            nome: "Petrobrás 2",
            status: "manut"
        },
        {
            id_ambiente_hpc: 3,
            nome: "Petrobrás 3",
            status: "desativado"
        }
    ]

    ambientes.forEach(ambiente => {
        const statusExibir = (ambiente.status == "manut") ? "manutenção" : ambiente.status;
        htmlAmbientesitens.innerHTML += `
            <div class="item" onclick="abrirClusters(${ambiente.id_ambiente_hpc})">
                <h2>${ambiente.nome}</h2>

                <div class="status ${ambiente.status}">
                    <p>${statusExibir}</p>
                </div>
            </div>
        `;
    });

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


    function abrirClusters(id_ambiente_hpc) {
        // Futuramente, utilizar id_ambiente_hpc para consultar o banco.

        const clusters = [
            {
                id_cluster: 1,
                nome: "Cluster 1",
                status: "ativo"
            },
            {
                id_cluster: 2,
                nome: "Cluster 2",
                status: "manut"
            },
            {
                id_cluster: 3,
                nome: "Cluster 3",
                status: "desativado"
            }
        ];

        // Limpa os clusters anteriores para não duplicar itens.
        htmlClusteritens.innerHTML = "";

        clusters.forEach(cluster => {
            const statusExibir =
                cluster.status === "manut"
                    ? "manutenção"
                    : cluster.status;

            htmlClusteritens.innerHTML += `
                <div class="item"
                    onclick="abrirNodes(${cluster.id_cluster})">
                    <h2>${cluster.nome}</h2>

                    <div class="status ${cluster.status}">
                        <p>${statusExibir}</p>
                    </div>
                </div>
            `;
        });

        // Exibe somente o seletor de clusters.
        htmlAmbientes.classList.add("none");
        htmlClusters.classList.remove("none");
        htmlNodes.classList.add("none");
        htmlDashboard.classList.add("none");
    }


    function abrirNodes(id_cluster) {
        // Futuramente, utilizar id_cluster para consultar o banco.

        const nodes = [
            {
                id_node: 1,
                hostname: "Node 01",
                ip: "192.168.0.1",
                sistema_operacional: "Linux",
                status: "ativo"
            },
            {
                id_node: 2,
                hostname: "Node 02",
                ip: "192.168.0.2",
                sistema_operacional: "Linux",
                status: "manut"
            },
            {
                id_node: 3,
                hostname: "Node 03",
                ip: "192.168.0.3",
                sistema_operacional: "Linux",
                status: "desativado"
            }
        ];

        // Limpa os nodes anteriores para não duplicar itens.
        htmlNodesItens.innerHTML = "";

        nodes.forEach(node => {
            const statusExibir =
                node.status === "manut"
                    ? "manutenção"
                    : node.status;

            htmlNodesItens.innerHTML += `
                <div class="item"
                    onclick="abrirDash(${node.id_node})">

                    <div class="item-titulo">
                        <h2>${node.hostname} ${node.sistema_operacional}</h2>
                        <p>${node.ip}</p>
                    </div>

                    <div class="status ${node.status}">
                        <p>${statusExibir}</p>
                    </div>
                </div>
            `;
        });

        // Exibe somente o seletor de nodes.
        htmlAmbientes.classList.add("none");
        htmlClusters.classList.add("none");
        htmlNodes.classList.remove("none");
        htmlDashboard.classList.add("none");
    }

    function abrirDash(id_node) {
        // Futuramente, utilizar id_node para buscar as métricas do node.

        htmlAmbientes.classList.add("none");
        htmlClusters.classList.add("none");
        htmlNodes.classList.add("none");

        // Exibe a dashboard no lugar dos seletores.
        htmlDashboard.classList.remove("none");

        // Atualiza o tamanho dos gráficos depois que a dashboard aparece.
        requestAnimationFrame(() => {
            Chart.getChart("graficoCpu")?.resize();
            Chart.getChart("graficoRam")?.resize();
            Chart.getChart("graficoDisco")?.resize();
            Chart.getChart("graficoSwap")?.resize();
        });
    }

    const labels = [
        "15:10",
        "15:11",
        "15:12",
        "15:13",
        "15:14",
        "15:15"
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
        38,
        41,
        44,
        43,
        47,
        45,
        48,
        46,
        51,
        47,
        53,
        55,
        52,
        57,
        54,
        58,
        56,
        61,
        59,
        64,
        67,
        65,
        70,
        69,
        73,
        70,
        74,
        71,
        76,
        69.9
    ]);

    configurarGrafico("graficoRam", [
        98,
        99,
        97,
        100,
        98,
        96,
        97,
        94,
        92,
        90,
        87,
        85,
        87,
        84,
        86,
        82,
        84,
        80,
        78,
        74,
        71,
        74,
        73,
        76,
        75,
        78,
        77,
        81,
        80,
        79.8
    ]);

    configurarGrafico("graficoDisco", [
        83,
        82,
        81,
        83,
        82,
        85,
        87,
        89,
        88,
        90,
        88,
        91,
        89,
        90,
        92,
        90,
        88,
        86,
        85,
        87,
        86,
        85,
        87,
        84,
        86,
        84,
        85,
        84,
        83,
        83.4
    ]);

    configurarGrafico("graficoSwap", [
        31,
        29,
        30,
        27,
        25,
        26,
        23,
        22,
        24,
        23,
        24,
        25,
        27,
        28,
        30,
        27,
        29,
        28,
        25,
        23,
        24,
        22,
        24,
        23,
        26,
        25,
        28,
        30,
        32,
        30.7
    ]);
