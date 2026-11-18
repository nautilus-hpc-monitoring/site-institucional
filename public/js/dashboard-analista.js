/* ---------- Sessão e sidebar mobile ---------- */

if (sessionStorage.NOME_USUARIO) {
    const nomeUsuario = document.getElementById("b_usuario");

    if (nomeUsuario) {
        nomeUsuario.innerHTML = sessionStorage.NOME_USUARIO;
    }

    const usuarioMobile = document.getElementById("b_usuario_mobile");

    if (usuarioMobile) {
        usuarioMobile.innerHTML = sessionStorage.NOME_USUARIO;
    }
}

const mobileSidebar = document.getElementById("mobileSidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");

document.getElementById("open-sidebar-btn").onclick = function () {
    mobileSidebar.classList.add("active");
    sidebarOverlay.classList.add("active");
};

document.getElementById("close-sidebar-btn").onclick = function () {
    mobileSidebar.classList.remove("active");
    sidebarOverlay.classList.remove("active");
};

sidebarOverlay.onclick = function () {
    mobileSidebar.classList.remove("active");
    sidebarOverlay.classList.remove("active");
};

/* ---------- Dados (mock) ---------- */

const SEMANAS = [
    "07 abr", "14 abr", "21 abr", "28 abr",
    "05 mai", "12 mai", "19 mai", "26 mai",
    "02 jun", "09 jun", "16 jun", "23 jun",
    "30 jun", "07 jul", "14 jul", "21 jul",
    "28 jul", "04 ago", "11 ago", "18 ago",
    "25 ago", "01 set", "08 set", "15 set"
];

const COMPONENTES = {
    cpu: {
        nome: "CPU",
        cor: "#2f7fe0",
        corSuave: "rgba(47, 127, 224, 0.35)",
        valores: [
            45, 48, 47, 50, 44, 82, 46, 43,
            49, 45, 85, 46, 47, 44, 84, 50,
            46, 43, 88, 49, 45, 50, 46, 97.8
        ],
        percentis: { p50: 51, p90: 73, p95: 81, p99: 94 }
    },
    ram: {
        nome: "RAM",
        cor: "#7c6cd6",
        corSuave: "rgba(124, 108, 214, 0.35)",
        valores: [
            47, 45, 42, 46, 44, 83, 46, 44,
            41, 45, 43, 86, 44, 42, 46, 43,
            45, 41, 85, 44, 42, 45, 43, 44
        ],
        percentis: { p50: 48, p90: 71, p95: 84, p99: 92 }
    },
    disco: {
        nome: "Disco",
        cor: "#f08a3c",
        corSuave: "rgba(240, 138, 60, 0.35)",
        valores: [
            47, 48, 44, 49, 47, 48, 46, 49,
            47, 49, 48, 47, 49, 46, 48, 47,
            49, 46, 48, 82, 47, 49, 48, 48
        ],
        percentis: { p50: 49, p90: 66, p95: 78, p99: 90 }
    }
};

const CORES_GRAFICO = {
    regressao: "#e8503a",
    pico: "#f08c3c",
    residuo: "#d64545"
};

const LIMITE_PICO = 80;

/* ---------- Cálculos auxiliares ---------- */

function calcularMedia(valores) {
    const soma = valores.reduce((total, valor) => total + valor, 0);
    return soma / valores.length;
}

function calcularRegressao(valores) {
    const n = valores.length;
    const mediaX = (n - 1) / 2;
    const mediaY = calcularMedia(valores);

    let numerador = 0;
    let denominador = 0;

    valores.forEach((valor, indice) => {
        numerador += (indice - mediaX) * (valor - mediaY);
        denominador += Math.pow(indice - mediaX, 2);
    });

    const inclinacao = denominador === 0 ? 0 : numerador / denominador;

    return {
        inclinacao: inclinacao,
        intercepto: mediaY - inclinacao * mediaX
    };
}

function preverRegressao(regressao, indice) {
    return regressao.intercepto + regressao.inclinacao * indice;
}

function pontosDePico(valores) {
    return valores
        .map((valor, indice) => ({ valor: valor, indice: indice }))
        .filter(item => item.valor > LIMITE_PICO)
        .map(item => ({ x: SEMANAS[item.indice], y: item.valor }));
}

function pontosDeResiduo(valores, regressao) {
    const candidatos = valores
        .map((valor, indice) => ({
            indice: indice,
            valor: valor,
            residuo: Math.abs(valor - preverRegressao(regressao, indice))
        }))
        .filter(item => item.valor <= LIMITE_PICO && item.residuo > 5)
        .sort((a, b) => b.residuo - a.residuo)
        .slice(0, 3);

    return candidatos.map(item => ({ x: SEMANAS[item.indice], y: item.valor }));
}

function formatarPorcentagem(valor) {
    return valor.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }) + "%";
}

function formatarNumero(valor, casas) {
    return valor.toLocaleString("pt-BR", {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas
    });
}

/* ---------- Gráficos semanais ---------- */

function criarSerieSemestreAnterior(valores) {
    const base = calcularMedia(valores) * 0.9;

    return valores.map((valor, indice) => {
        const oscilacao = Math.sin(indice / 2.3) * 2.6 + Math.cos(indice / 1.7) * 1.4;
        return Math.round((base + oscilacao) * 10) / 10;
    });
}

function criarGraficoComponente(chave, componente) {
    const canvas = document.getElementById("chart-" + chave);

    if (!canvas) {
        return;
    }

    const valores = componente.valores;
    const regressao = calcularRegressao(valores);
    const linhaRegressao = valores.map((valor, indice) => {
        const previsto = preverRegressao(regressao, indice);
        return Math.min(100, Math.max(0, Math.round(previsto * 10) / 10));
    });

    const media = calcularMedia(valores);
    const elementoMedia = document.getElementById("media-" + chave);

    if (elementoMedia) {
        elementoMedia.textContent = formatarPorcentagem(media);
    }

    const nota = document.getElementById("nota-" + chave);

    if (nota) {
        const quantidadePicos = valores.filter(valor => valor > LIMITE_PICO).length;
        nota.textContent = quantidadePicos === 1
            ? "1 pico pontual fora do padrão"
            : quantidadePicos + " picos pontuais fora do padrão";
    }

    new Chart(canvas.getContext("2d"), {
        type: "line",
        data: {
            labels: SEMANAS,
            datasets: [
                {
                    label: "Semestre anterior",
                    data: criarSerieSemestreAnterior(valores),
                    borderColor: componente.corSuave,
                    backgroundColor: componente.corSuave,
                    borderWidth: 1.5,
                    borderDash: [4, 4],
                    tension: 0.25,
                    pointRadius: 0,
                    pointHoverRadius: 3
                },
                {
                    label: "Semestre atual",
                    data: valores,
                    borderColor: componente.cor,
                    backgroundColor: componente.cor,
                    borderWidth: 2,
                    tension: 0.15,
                    pointRadius: 1.6,
                    pointHoverRadius: 5,
                    pointBackgroundColor: componente.cor,
                    pointBorderColor: componente.cor
                },
                {
                    label: "Inclinação da Regressão linear",
                    data: linhaRegressao,
                    borderColor: CORES_GRAFICO.regressao,
                    backgroundColor: CORES_GRAFICO.regressao,
                    borderWidth: 2.4,
                    tension: 0,
                    pointRadius: 0,
                    pointHoverRadius: 0
                },
                {
                    label: "Pico de carga (>80%)",
                    type: "scatter",
                    data: pontosDePico(valores),
                    backgroundColor: CORES_GRAFICO.pico,
                    borderColor: CORES_GRAFICO.pico,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: "Anomalia de resíduo",
                    type: "scatter",
                    data: pontosDeResiduo(valores, regressao),
                    backgroundColor: CORES_GRAFICO.residuo,
                    borderColor: CORES_GRAFICO.residuo,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 8, right: 8 }
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

                            return context.dataset.label + ": " +
                                valor.toLocaleString("pt-BR", {
                                    maximumFractionDigits: 1
                                }) + "%";
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
                        callback: function (valor) {
                            return valor + "%";
                        },
                        color: "#9ca3af",
                        font: { size: 10 }
                    },
                    grid: {
                        color: "#f1f3f5",
                        drawBorder: false
                    },
                    border: {
                        display: false
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: "#9ca3af",
                        font: { size: 10 },
                        maxRotation: 0,
                        autoSkip: false,
                        callback: function (valor, indice) {
                            return [0, 4, 8, 12, 16, 20, 23].includes(indice)
                                ? this.getLabelForValue(valor)
                                : "";
                        }
                    }
                }
            }
        }
    });
}

Object.keys(COMPONENTES).forEach(chave => {
    criarGraficoComponente(chave, COMPONENTES[chave]);
});

/* ---------- Percentis por componente ---------- */

const abasComponentes = document.querySelectorAll("#component-tabs .tab");

abasComponentes.forEach(aba => {
    aba.addEventListener("click", function () {
        abasComponentes.forEach(outra => {
            outra.classList.remove("active");
            outra.setAttribute("aria-selected", "false");
        });

        aba.classList.add("active");
        aba.setAttribute("aria-selected", "true");

        const percentis = COMPONENTES[aba.dataset.componente].percentis;

        document.querySelectorAll("#percentis [data-percentil]").forEach(elemento => {
            elemento.textContent = percentis[elemento.dataset.percentil] + "%";
        });
    });
});

/* ---------- Correlação Disco × CPU ---------- */

function gerarRegistros(quantidade) {
    let semente = 20260915;

    function aleatorio() {
        semente = (semente * 1103515245 + 12345) % 2147483648;
        return semente / 2147483648;
    }

    const registros = [];

    for (let indice = 0; indice < quantidade; indice++) {
        const iops = 100 + aleatorio() * 1900;
        const ruido = (aleatorio() - 0.5) * 11;
        const espera = 0.0162 * iops + 2.74 + ruido;

        registros.push({
            x: Math.round(iops),
            y: Math.round(Math.max(0.6, espera) * 10) / 10
        });
    }

    return registros;
}

function calcularCorrelacao(pontos) {
    const n = pontos.length;
    const mediaX = pontos.reduce((total, ponto) => total + ponto.x, 0) / n;
    const mediaY = pontos.reduce((total, ponto) => total + ponto.y, 0) / n;

    let somaXY = 0;
    let somaXX = 0;
    let somaYY = 0;

    pontos.forEach(ponto => {
        somaXY += (ponto.x - mediaX) * (ponto.y - mediaY);
        somaXX += Math.pow(ponto.x - mediaX, 2);
        somaYY += Math.pow(ponto.y - mediaY, 2);
    });

    const inclinacao = somaXY / somaXX;
    const intercepto = mediaY - inclinacao * mediaX;
    const r = somaXY / Math.sqrt(somaXX * somaYY);

    return {
        inclinacao: inclinacao,
        intercepto: intercepto,
        r: r,
        r2: r * r
    };
}

const registrosCorrelacao = gerarRegistros(120);
const correlacao = calcularCorrelacao(registrosCorrelacao);

const elementoR = document.getElementById("r-correlacao");

if (elementoR) {
    elementoR.textContent = formatarNumero(correlacao.r, 2);
}

let graficoCorrelacao = null;

function criarGraficoCorrelacao() {
    if (graficoCorrelacao) {
        return;
    }

    const canvas = document.getElementById("chart-correlacao");

    if (!canvas) {
        return;
    }

    graficoCorrelacao = new Chart(canvas.getContext("2d"), {
        type: "scatter",
        data: {
            datasets: [
                {
                    label: "Registros",
                    data: registrosCorrelacao,
                    backgroundColor: "#2d8ea8",
                    borderColor: "#2d8ea8",
                    pointRadius: 2.4,
                    pointHoverRadius: 4
                },
                {
                    label: "Regressão linear",
                    type: "line",
                    data: [
                        { x: 0, y: correlacao.intercepto },
                        { x: 2000, y: correlacao.intercepto + correlacao.inclinacao * 2000 }
                    ],
                    borderColor: "#0f3f4d",
                    backgroundColor: "#0f3f4d",
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
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
                            const ponto = context.parsed;

                            if (context.dataset.type === "line") {
                                return "Regressão linear";
                            }

                            return "IOPS: " + ponto.x.toLocaleString("pt-BR") +
                                " • espera: " + formatarNumero(ponto.y, 1) + "%";
                        }
                    }
                }
            },
            scales: {
                x: {
                    min: 0,
                    max: 2000,
                    ticks: {
                        stepSize: 500,
                        color: "#9ca3af",
                        font: { size: 10 }
                    },
                    grid: {
                        color: "#eceff2",
                        drawBorder: false
                    },
                    border: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: "Leitura + escrita em disco (IOPS)",
                        color: "#6b7480",
                        font: { size: 10, weight: "600" }
                    }
                },
                y: {
                    min: 0,
                    max: 40,
                    ticks: {
                        stepSize: 10,
                        color: "#9ca3af",
                        font: { size: 10 }
                    },
                    grid: {
                        color: "#eceff2",
                        drawBorder: false
                    },
                    border: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: "Tempo de espera da CPU • IO wait (%)",
                        color: "#6b7480",
                        font: { size: 10, weight: "600" }
                    }
                }
            }
        }
    });

    const elementoR2 = document.getElementById("corr-r2");
    const elementoRModal = document.getElementById("corr-r");
    const elementoEquacao = document.getElementById("corr-equacao");

    if (elementoR2) {
        elementoR2.textContent = formatarNumero(correlacao.r2, 2);
    }

    if (elementoRModal) {
        elementoRModal.textContent = formatarNumero(correlacao.r, 2);
    }

    if (elementoEquacao) {
        elementoEquacao.textContent = "y = " +
            formatarNumero(correlacao.inclinacao, 4) + "x + " +
            formatarNumero(correlacao.intercepto, 2);
    }
}

/* ---------- Modais ---------- */

const modais = document.querySelectorAll(".dash-modal-overlay");

function abrirModal(modal) {
    if (!modal) {
        return;
    }

    modal.classList.add("active");
    document.body.style.overflow = "hidden";

    const botaoFechar = modal.querySelector(".dash-modal-close");

    if (botaoFechar) {
        botaoFechar.focus();
    }
}

function fecharModal(modal) {
    if (!modal) {
        return;
    }

    modal.classList.remove("active");

    if (!document.querySelector(".dash-modal-overlay.active")) {
        document.body.style.overflow = "";
    }
}

function fecharTodosOsModais() {
    modais.forEach(modal => modal.classList.remove("active"));
    document.body.style.overflow = "";
}

document.getElementById("btn-ajuda").addEventListener("click", function () {
    abrirModal(document.getElementById("modal-ajuda"));
});

document.getElementById("btn-correlacao").addEventListener("click", function () {
    criarGraficoCorrelacao();
    abrirModal(document.getElementById("modal-correlacao"));
});

modais.forEach(modal => {
    modal.addEventListener("click", function (evento) {
        if (evento.target === modal) {
            fecharModal(modal);
        }
    });
});

document.querySelectorAll("[data-fechar-modal]").forEach(botao => {
    botao.addEventListener("click", function () {
        fecharModal(botao.closest(".dash-modal-overlay"));
    });
});

document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape") {
        fecharTodosOsModais();
    }
});
