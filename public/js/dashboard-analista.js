if (sessionStorage.NOME_USUARIO) {
    document.getElementById("b_usuario").innerHTML = sessionStorage.NOME_USUARIO;

    const usuarioMobile = document.getElementById("b_usuario_mobile");

    if (usuarioMobile) {
        usuarioMobile.innerHTML = sessionStorage.NOME_USUARIO;
    }
}

const mobileSidebar = document.getElementById("mobileSidebar");

document.getElementById("open-sidebar-btn").onclick = function () {
    mobileSidebar.classList.add("active");

    document
        .getElementById("sidebar-overlay")
        .classList.add("active");
};

document.getElementById("close-sidebar-btn").onclick = function () {
    mobileSidebar.classList.remove("active");

    document
        .getElementById("sidebar-overlay")
        .classList.remove("active");
};

document.getElementById("sidebar-overlay").onclick = function () {
    mobileSidebar.classList.remove("active");

    document
        .getElementById("sidebar-overlay")
        .classList.remove("active");
};

const ctx = document.getElementById("line-chart").getContext("2d");

const labels = [
    "07 abr", "14 abr", "21 abr", "28 abr",
    "05 mai", "12 mai", "19 mai", "26 mai",
    "02 jun", "09 jun", "16 jun", "23 jun",
    "30 jun", "07 jul", "14 jul", "21 jul",
    "28 jul", "04 ago", "11 ago", "18 ago",
    "25 ago", "01 set", "08 set", "15 set"
];

const dataCPU = [
    38, 42, 40, 45, 43, 48, 46, 51,
    49, 55, 82, 47, 58, 54, 61, 84,
    64, 60, 56, 88, 63, 71, 66, 97.8
];

const dataRAM = [
    48, 49, 47, 50, 51, 52, 50, 54,
    53, 55, 54, 82, 56, 57, 85, 58,
    60, 59, 87, 86, 60, 62, 63, 64
];

const dataDisco = [
    66, 66, 67, 67, 68, 68, 68, 81,
    69, 69, 70, 84, 86, 71, 71, 71,
    72, 83, 72, 73, 91, 87, 74, 75
];

function pontosComOutliers(dados) {
    return dados.map(valor => {
        if (valor === null || valor === undefined) {
            return "#dc2626";
        }

        return valor > 80 ? "#dc2626" : null;
    });
}

function bordasComOutliers(dados, corOriginal) {
    return dados.map(valor => valor > 80 ? "#dc2626" : corOriginal);
}

function criarDataset(label, dados, cor) {
    return {
        label: label,
        data: dados,
        borderColor: cor,
        backgroundColor: cor,
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: dados.map(valor =>
            valor > 80 ? "#dc2626" : cor
        ),
        pointBorderColor: dados.map(valor =>
            valor > 80 ? "#dc2626" : cor
        ),
        pointBorderWidth: 2,
        segment: {
            borderColor: context => {
                const valorAnterior = context.p0.parsed.y;
                const valorAtual = context.p1.parsed.y;

                return valorAnterior > 80 || valorAtual > 80
                    ? "#dc2626"
                    : cor;
            }
        }
    };
}

const myChart = new Chart(ctx, {
    type: "line",
    data: {
        labels: labels,
        datasets: [
            criarDataset("Média CPU", dataCPU, "#3b82f6"),
            criarDataset("Média RAM", dataRAM, "#8b5cf6"),
            criarDataset("Média Disco", dataDisco, "#f97316")
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: {
                top: 10,
                right: 12
            }
        },
        interaction: {
            mode: "nearest",
            intersect: false
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        const valor = context.parsed.y;

                        if (valor === null || valor === undefined) {
                            return "";
                        }

                        const alerta = valor > 80 ? " (fora do padrão)" : "";

                        return context.dataset.label + ": " +
                            valor.toLocaleString("pt-BR") + "%" + alerta;
                    }
                }
            }
        },
        scales: {
            y: {
                min: 0,
                max: 100,
                ticks: {
                    stepSize: 25,
                    callback: function (value) {
                        return value + "%";
                    },
                    color: "#9ca3af",
                    font: {
                        size: 12
                    }
                },
                grid: {
                    color: "#f3f4f6",
                    borderDash: [5, 5],
                    drawBorder: false
                }
            },
            x: {
                grid: {
                    display: false,
                    drawBorder: false
                },
                ticks: {
                    color: "#9ca3af",
                    font: {
                        size: 12
                    },
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 12
                }
            }
        }
    }
});
