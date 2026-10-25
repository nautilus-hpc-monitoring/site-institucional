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
    60, 59, 57, 86, 60, 62, 63, 64
];

const dataDisco = [
    66, 66, 67, 67, 68, 68, 68, 81,
    69, 69, 70, 70, 86, 71, 71, 71,
    72, 83, 72, 73, 91, 74, 74, 75
];

const dataAlertas = [
    null, 88, null, 91, null, 86,
    null, 89, null, 94, null, 87,
    null, 90, null, 92, null, 85,
    null, 96, 88, 89, 97.8, 93
];

const myChart = new Chart(ctx, {
    type: "line",
    data: {
        labels: labels,
        datasets: [
            {
                label: "Média CPU",
                data: dataCPU,
                borderColor: "#3b82f6",
                backgroundColor: "#3b82f6",
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 3,
                pointHoverRadius: 6
            },
            {
                label: "Média RAM",
                data: dataRAM,
                borderColor: "#8b5cf6",
                backgroundColor: "#8b5cf6",
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 3,
                pointHoverRadius: 6
            },
            {
                label: "Média Disco",
                data: dataDisco,
                borderColor: "#f97316",
                backgroundColor: "#f97316",
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 3,
                pointHoverRadius: 6
            },
            {
                label: "Alertas fora do padrão",
                data: dataAlertas,
                borderColor: "#dc2626",
                backgroundColor: "#dc2626",
                pointBackgroundColor: "#dc2626",
                pointBorderColor: "#ffffff",
                pointBorderWidth: 2,
                borderWidth: 0,
                pointRadius: 6,
                pointHoverRadius: 9,
                pointStyle: "triangle",
                showLine: false,
                spanGaps: false
            }
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

                        if (context.dataset.label === "Alertas fora do padrão") {
                            return "Alerta fora do padrão: " +
                                valor.toLocaleString("pt-BR") + "%";
                        }

                        return context.dataset.label + ": " +
                            valor.toLocaleString("pt-BR") + "%";
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
