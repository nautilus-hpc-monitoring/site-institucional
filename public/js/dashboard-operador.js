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

    document.getElementById('open-sidebar-btn').onclick = function () {
        mobileSidebar.classList.add('active');
        document.getElementById('sidebar-overlay').classList.add('active');
    };
    document.getElementById('close-sidebar-btn').onclick = function () {
        mobileSidebar.classList.remove('active');
        document.getElementById('sidebar-overlay').classList.remove('active');
    };
    document.getElementById('sidebar-overlay').onclick = function () {
        mobileSidebar.classList.remove('active');
        document.getElementById('sidebar-overlay').classList.remove('active');
    };


    function abrirClusters(id_ambiente_hpc) {
        // id_ambiente_hpc vai ser utilizado para pesquisa no banco de dados
        const clusters = [
            {
                id_cluster: 1,
                nome: "cluster 1",
                status: "ativo"
            },
            {
                id_cluster: 2,
                nome: "cluster 2",
                status: "manut"
            },
            {
                id_cluster: 3,
                nome: "cluster 3",
                status: "desativado"
            }
        ]

        clusters.forEach(cluster => {
            const statusExibir = (cluster.status == "manut") ? "manutenção" : cluster.status;
            htmlClusteritens.innerHTML += `
                <div class="item" onclick="abrirNodes(${cluster.id_cluster})">
                    <h2>${cluster.nome}</h2>

                    <div class="status ${cluster.status}">
                        <p>${statusExibir}</p>
                    </div>
                </div>
            `;
        });

        htmlClusters.classList.toggle("none");
        htmlAmbientes.classList.add("none");
    }

    function abrirNodes(id_cluster) {
        // id_cluster vai ser utilizado para pesquisa no banco de dados
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

        nodes.forEach(node => {
            const statusExibir = (node.status == "manut") ? "manutenção" : node.status;
            htmlNodesItens.innerHTML += `
                <div class="item" onclick="abrirDash(${node.id_node})">
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

        htmlClusters.classList.add("none");
        htmlNodes.classList.toggle("none");
    }

    function abrirDash(id_node) {
        htmlNodes.classList.add("none");
        htmlDashboard.classList.toggle("none");
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
