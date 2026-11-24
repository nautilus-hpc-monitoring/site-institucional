/* Dashboard do analista: consome /dashanalista e desenha a tela.
 *
 * MAPA DO ARQUIVO
 *  1. Sessão e sidebar.
 *  2. Configuração visual e utilidades de formatação.
 *  3. Estado da página.
 *  4. Comunicação com a API.
 *  5. Carga de cluster, node e período.
 *  6. KPIs.
 *  7. Percentis.
 *  8. Gráficos semanais.
 *  9. Correlação (cartão e modal).
 * 10. Rodapé, estado vazio e modais.
 * 11. Inicialização.
 *
 * De onde vêm os números: silver2goldAnalista.py publica
 * 03-gold/analista/cluster=<id>/dashboard.json; o controller do Node lê esse
 * arquivo e devolve apenas o node selecionado. Esta página não calcula medições:
 * ela apenas formata e desenha o que recebeu.
 */

/* ---------- 1. SESSÃO E SIDEBAR ---------- */

// protegerPagina() está em sessao.js: se não houver ID_USUARIO, vai para o login.
protegerPagina();

// Mostra o nome do usuário no topo (desktop e menu mobile).
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

// Abre e fecha o menu lateral no celular.
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

/* ---------- 2. CONFIGURAÇÃO E UTILIDADES ---------- */

// Atalho para buscar elementos pelo id (evita repetir document.getElementById).
const elemento = (id) => document.getElementById(id);

// true apenas para números de verdade (descarta null, undefined, NaN e texto).
const numero = (valor) => typeof valor === "number" && Number.isFinite(valor);

// Cada componente tem nome e cor próprios, iguais aos usados na ETL e no CSS.
const COMPONENTES = {
    cpu: { nome: "CPU", cor: "#2f7fe0", corSuave: "rgba(47, 127, 224, 0.35)" },
    ram: { nome: "RAM", cor: "#7c6cd6", corSuave: "rgba(124, 108, 214, 0.35)" },
    disco: { nome: "Disco", cor: "#f08a3c", corSuave: "rgba(240, 138, 60, 0.35)" }
};

const CORES_GRAFICO = {
    regressao: "#e8503a",
    pico: "#f08c3c",
    residuo: "#d64545"
};

function limitePico() {
    return numero(metadados?.limite_pico) ? metadados.limite_pico : 80;
}

// Formata porcentagem no padrão brasileiro: 55.7 -> "55,7%".
function formatarPorcentagem(valor, casas = 1) {
    if (!numero(valor)) {
        return "—";
    }
    return valor.toLocaleString("pt-BR", {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas
    }) + "%";
}

// Formata número comum: 96.6 -> "96,6".
function formatarNumero(valor, casas = 1) {
    if (!numero(valor)) {
        return "—";
    }
    return valor.toLocaleString("pt-BR", {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas
    });
}

// Formata data/hora local de São Paulo.
function formatarDataHora(valor) {
    if (!valor) {
        return "—";
    }
    const data = new Date(valor);
    if (!Number.isFinite(data.getTime())) {
        return "—";
    }
    return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

// Nome curto do mês, para rótulos do tipo "07 abr".
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez"];

// "2026-11-16" -> "16 nov" (usado para achar o rótulo de uma anomalia).
function rotuloDaData(iso) {
    const partes = String(iso || "").split("-");
    if (partes.length !== 3) {
        return "";
    }
    const dia = Number(partes[2]);
    const mes = Number(partes[1]) - 1;
    return String(dia).padStart(2, "0") + " " + (MESES_CURTOS[mes] || "");
}

// Escreve textContent em um elemento pelo id, sem quebrar se ele não existir.
function texto(id, valor) {
    const alvo = elemento(id);
    if (alvo) {
        alvo.textContent = valor;
    }
}

// Escreve em um <em class="delta..."> e escolhe a cor.
// valor null/undefined limpa o texto e esconde a marcação.
function escreverDelta(id, textoDelta, classe) {
    const alvo = elemento(id);
    if (!alvo) {
        return;
    }
    alvo.textContent = textoDelta || "";
    alvo.className = "delta " + (classe || "delta-neutral");
}

// Média simples de uma lista, ignorando posições vazias.
function media(valores) {
    const validos = valores.filter(numero);
    if (!validos.length) {
        return null;
    }
    return validos.reduce((total, item) => total + item, 0) / validos.length;
}

/* ---------- 3. ESTADO ---------- */

let clusters = [];        // lista devolvida por /dashanalista/clusters
let painel = null;        // resposta completa do último /dados
let metadados = null;     // quando o JSON foi gerado
let avisos = [];          // mensagens de configuração/falha do S3
let periodoAtual = "6";   // opção do seletor de período
let consultaAtual = 0;   // permite descartar respostas de seleções anteriores
const graficos = {};      // instâncias do Chart.js por componente

function dadosDoPeriodo(node) {
    return periodoAtual === "6" ? node : node?.periodos?.[periodoAtual];
}

/* ---------- 4. COMUNICAÇÃO COM A API ---------- */

// Toda chamada anexa ?idUsuario= porque o servidor autoriza por ele.
async function api(caminho) {
    const idUsuario = sessionStorage.getItem("ID_USUARIO");
    if (!idUsuario) {
        location.href = "./login.html";
        throw new Error("Sessão expirada.");
    }

    const separador = caminho.includes("?") ? "&" : "?";
    const resposta = await fetch(
        caminho + separador + "idUsuario=" + encodeURIComponent(idUsuario),
        { cache: "no-store" }
    );

    // 401 significa que o servidor recusou a sessão.
    if (resposta.status === 401) {
        location.href = "./login.html";
        throw new Error("Sessão expirada.");
    }

    const dados = await resposta.json();
    if (!resposta.ok) {
        throw new Error(dados.erro || "Falha ao consultar dados.");
    }
    return dados;
}

/* ---------- 5. CARGA DE CLUSTER, NODE E PERÍODO ---------- */

// Preenche um <select> com uma lista de valores.
function preencherSelect(select, itens) {
    if (!select) {
        return;
    }
    // new Option(texto, valor) cria as opções uma a uma.
    select.replaceChildren(...itens.map(function (item) {
        return new Option(item.texto, String(item.valor));
    }));
    select.disabled = itens.length === 0;
}

// Busca os clusters do usuário e inicia pela primeira opção.
async function iniciar() {
    try {
        clusters = await api("/dashanalista/clusters");

        if (!clusters.length) {
            mostrarEstado("Nenhum cluster disponível para este usuário.");
            return;
        }

        preencherSelect(elemento("seletor-cluster"), clusters.map(function (cluster) {
            return {
                valor: cluster.cluster_id,
                texto: cluster.hpc_nome + " • " + cluster.cluster_nome
            };
        }));

        await carregarCluster(clusters[0].cluster_id);
    } catch (erro) {
        mostrarEstado(erro.message);
    }
}

// Preenche o seletor com o cadastro e consulta a telemetria do primeiro node.
async function carregarCluster(idCluster) {
    const consulta = ++consultaAtual;
    const seletorNode = elemento("seletor-node");
    seletorNode.replaceChildren(new Option("Carregando…", ""));
    seletorNode.disabled = true;
    painel = null;
    mostrarEstado("Carregando nodes do cluster…");

    try {
        const cadastro = await api("/dashanalista/clusters/" + encodeURIComponent(idCluster) + "/nodes");
        if (consulta !== consultaAtual) {
            return;
        }

        preencherSelect(seletorNode, cadastro.map(function (node) {
            return { valor: node.hostname, texto: node.hostname };
        }));

        if (!cadastro.length) {
            seletorNode.replaceChildren(new Option("Nenhum node cadastrado", ""));
            mostrarEstado("Nenhum node cadastrado para este cluster.");
            return;
        }

        await carregarNode(idCluster, cadastro[0].hostname);
    } catch (erro) {
        if (consulta === consultaAtual) {
            seletorNode.replaceChildren(new Option("Nodes indisponíveis", ""));
            mostrarEstado(erro.message);
        }
    }
}

async function carregarNode(idCluster, hostname) {
    if (!idCluster || !hostname) {
        return;
    }

    const consulta = ++consultaAtual;
    painel = null;
    mostrarEstado("Carregando telemetria do node…");

    try {
        const dados = await api(
            "/dashanalista/clusters/" + encodeURIComponent(idCluster) +
            "/dados?node=" + encodeURIComponent(hostname)
        );
        if (consulta !== consultaAtual) {
            return;
        }

        painel = dados;
        metadados = dados.metadados;
        avisos = dados.avisos || [];
        renderizar(dados.node);
    } catch (erro) {
        if (consulta === consultaAtual) {
            mostrarEstado(erro.message);
        }
    }
}

/* ---------- 6. KPIs ---------- */

// Os deltas precisam da janela completa e da comparação publicada pela ETL.
function podeComparar(node) {
    return periodoAtual === "6" && Boolean(node.comparacao && node.comparacao.disponivel);
}

// Variação percentual entre dois valores: (atual - anterior) / anterior * 100.
function variacaoPercentual(atual, anterior) {
    if (!numero(atual) || !numero(anterior) || anterior === 0) {
        return null;
    }
    return (atual - anterior) / anterior * 100;
}

function resumirComparacao(comparacao) {
    const atuais = [];
    const anteriores = [];
    for (const chave of Object.keys(COMPONENTES)) {
        const atual = comparacao.medias_atuais?.[chave];
        const anterior = comparacao.medias_anteriores?.[chave];
        if (numero(atual) && numero(anterior)) {
            atuais.push(atual);
            anteriores.push(anterior);
        }
    }

    const atual = media(atuais);
    const anterior = media(anteriores);
    return { atual, anterior, variacao: variacaoPercentual(atual, anterior) };
}

// Texto com sinal: 9 -> "+9", -3 -> "-3".
function comSinal(valor) {
    return (valor > 0 ? "+" : "") + valor;
}
// Preenche os quatro cartões de KPI.
function renderizarKpis(node) {
    const kpis = node.kpis || {};
    const anterior = kpis.periodo_anterior || {};
    const comparavel = podeComparar(node);

    /* Maior pico: componente, valor e instante. */
    const pico = kpis.maior_pico;
    if (pico && numero(pico.valor)) {
        texto("kpi-pico-sub", pico.texto || pico.componente_nome);
        texto("kpi-pico-valor", formatarPorcentagem(pico.valor));

        const delta = comparavel
            ? variacaoPercentual(pico.valor, (anterior.maior_pico || {}).valor)
            : null;
        escreverDelta(
            "kpi-pico-delta",
            numero(delta) ? comSinal(Math.round(delta)) + "%" : "",
            delta > 0 ? "delta-orange" : "delta-neutral"
        );
    } else {
        texto("kpi-pico-sub", "Nenhum pico acima de " + limitePico() + "%");
        texto("kpi-pico-valor", "0%");
        escreverDelta("kpi-pico-delta", "", "delta-neutral");
    }

    /* Maior anomalia: resíduo da média semanal em relação à reta. */
    const anomalia = kpis.maior_anomalia;
    if (anomalia && numero(anomalia.residuo)) {
        texto("kpi-anomalia-sub", anomalia.componente_nome + " • semana de " + anomalia.rotulo);
        texto("kpi-anomalia-valor", formatarNumero(anomalia.residuo, 1) + " pp");
    } else {
        texto("kpi-anomalia-sub", "Sem anomalias");
        texto("kpi-anomalia-valor", "0 pp");
    }

    /* Quantidade de picos e tempo acumulado. */
    const quantidadePicos = numero(kpis.quantidade_picos) ? kpis.quantidade_picos : 0;
    texto("kpi-picos-total", quantidadePicos + (quantidadePicos === 1 ? " pico" : " picos"));
    texto("kpi-picos-desc", (kpis.duracao_acumulada_picos_texto || "0min") + " acumulados de picos");
    const deltaPicos = comparavel && numero(anterior.quantidade_picos)
        ? quantidadePicos - anterior.quantidade_picos
        : null;
    escreverDelta(
        "kpi-picos-delta",
        numero(deltaPicos) ? comSinal(deltaPicos) + (Math.abs(deltaPicos) === 1 ? " pico" : " picos") : "",
        deltaPicos > 0 ? "delta-orange" : "delta-neutral"
    );

    /* Quantidade de anomalias. */
    const quantidadeAnomalias = numero(kpis.quantidade_anomalias) ? kpis.quantidade_anomalias : 0;
    texto(
        "kpi-anomalias-valor",
        quantidadeAnomalias === 0 ? "Sem anomalias" : quantidadeAnomalias + (quantidadeAnomalias === 1 ? " anomalia" : " anomalias")
    );
    texto(
        "kpi-anomalias-desc",
        quantidadeAnomalias === 0
            ? "Nenhuma anomalia no período"
            : "Desvios acima de " + (metadados?.limite_residuo ?? 5) + " pp da tendência semanal"
    );

    /* Duração do pico mais longo. */
    texto("kpi-duracao-valor", kpis.duracao_pico_mais_longo_texto || "0min");

    const deltaDuracao = comparavel && numero(anterior.duracao_pico_mais_longo_segundos)
        ? (kpis.duracao_pico_mais_longo_segundos - anterior.duracao_pico_mais_longo_segundos) / 60
        : null;
    escreverDelta(
        "kpi-duracao-delta",
        numero(deltaDuracao) ? comSinal(Math.round(deltaDuracao)) + " min" : "",
        deltaDuracao > 0 ? "delta-orange" : "delta-neutral"
    );

    /* Componente mais instável. */
    const instavel = kpis.componente_mais_instavel;
    if (instavel) {
        texto("kpi-instavel-valor", instavel.componente_nome);
        texto(
            "kpi-instavel-desc",
            numero(instavel.variacao_percentual)
                ? formatarPorcentagem(instavel.variacao_percentual) + " de variação no período"
                : formatarNumero(instavel.amplitude, 1) + " pp de amplitude no período"
        );
    } else {
        texto("kpi-instavel-valor", "—");
        texto("kpi-instavel-desc", "Semanas insuficientes para comparar");
    }

    /* Variação média dos componentes na janela completa. */
    const comparacao = node.comparacao || {};
    const variacaoGeral = comparavel ? resumirComparacao(comparacao).variacao : null;

    if (numero(variacaoGeral)) {
        texto("variation-valor", (variacaoGeral > 0 ? "+" : "") + formatarNumero(variacaoGeral, 1) + "%");

        // Abaixo de meio por cento a diferença é ruído: dizemos "estável".
        let frase;
        if (Math.abs(variacaoGeral) < 0.5) {
            frase = "Média geral de utilização praticamente estável em relação ao período anterior.";
        } else if (variacaoGeral > 0) {
            frase = "Média geral de utilização aumentou em relação ao período anterior.";
        } else {
            frase = "Média geral de utilização diminuiu em relação ao período anterior.";
        }
        texto("variation-info", frase);
    } else {
        texto("variation-valor", "—");
        texto(
            "variation-info",
            periodoAtual === "6"
                ? (comparacao.motivo || "Sem dados do período anterior para comparar.")
                : "A comparação com o período anterior está disponível na janela completa."
        );
    }
}

/* ---------- 7. PERCENTIS ---------- */

// Preenche o bloco de percentis do componente da aba clicada.
function renderizarPercentis(node, chave) {
    const dados = (node.componentes || {})[chave] || {};
    const percentis = dados.percentis || {};

    document.querySelectorAll("#percentis [data-percentil]").forEach(function (item) {
        const valor = percentis[item.dataset.percentil];
        item.textContent = numero(valor) ? formatarPorcentagem(valor, 1) : "—";
    });
}

// Liga as abas CPU/RAM/Disco.
function ligarAbas() {
    const abas = document.querySelectorAll("#component-tabs .tab");

    abas.forEach(function (aba) {
        aba.addEventListener("click", function () {
            // Remove o estado ativo de todas e aplica só na clicada.
            abas.forEach(function (outra) {
                outra.classList.remove("active");
                outra.setAttribute("aria-selected", "false");
            });
            aba.classList.add("active");
            aba.setAttribute("aria-selected", "true");

            const node = dadosDoPeriodo(painel?.node);
            if (node) {
                renderizarPercentis(node, aba.dataset.componente);
            }
        });
    });
}

/* ---------- 8. GRÁFICOS SEMANAIS ---------- */

// Remove o gráfico anterior antes de desenhar outro no mesmo canvas.
function destruirGrafico(chave) {
    if (graficos[chave]) {
        graficos[chave].destroy();
        delete graficos[chave];
    }
}

// Coloca uma mensagem no lugar do canvas quando não há dados.
function semDados(chave, mensagem) {
    destruirGrafico(chave);

    // O CSS .chart-vazio esconde o canvas e centraliza o texto.
    const caixa = elemento("chart-" + chave).parentElement;
    caixa.classList.add("chart-vazio");

    // Cria (uma única vez) o elemento de texto dentro da caixa.
    let aviso = caixa.querySelector(".chart-vazio-texto");
    if (!aviso) {
        aviso = document.createElement("span");
        aviso.className = "chart-vazio-texto";
        caixa.appendChild(aviso);
    }
    aviso.textContent = mensagem || "Sem dados para o período.";
}

// Desfaz o estado vazio antes de desenhar um gráfico.
function limparEstadoVazio(chave) {
    const caixa = elemento("chart-" + chave).parentElement;
    caixa.classList.remove("chart-vazio");
    const aviso = caixa.querySelector(".chart-vazio-texto");
    if (aviso) {
        aviso.remove();
    }
}

// Monta um gráfico de um componente (CPU, RAM ou Disco).
function criarGraficoComponente(node, chave) {
    const componente = COMPONENTES[chave];
    const dados = (node.componentes || {})[chave] || {};
    const rotulos = node.semanas?.rotulos || [];
    const medias = dados.medias || [];
    const linhaRegressao = dados.regressao?.linha || [];
    const mediaVisivel = numero(dados.media_geral) ? dados.media_geral : media(medias);
    texto("media-" + chave, formatarPorcentagem(mediaVisivel));

    if (!medias.some(numero)) {
        texto("nota-" + chave, "—");
        const usaCoberturaAntiga = metadados?.cobertura_minima > 0 && dados.amostras?.some((n) => n > 0);
        semDados(chave, usaCoberturaAntiga
            ? "Este JSON aplicou a cobertura antiga. Reprocesse a Gold com a ETL atualizada."
            : "Sem médias semanais para o período selecionado.");
        return;
    }

    // Pontos de pico: semanas cuja média passou do limite publicado.
    const pontosPico = medias
        .map(function (valor, indice) {
            return { x: rotulos[indice], y: valor };
        })
        .filter(function (ponto) {
            return numero(ponto.y) && ponto.y > limitePico();
        });

    const pontosAnomalia = (dados.anomalias || []).map(function (item) {
        return { x: rotuloDaData(item.semana), y: item.valor };
    });

    // Texto de apoio abaixo do título do cartão.
    // Aqui contamos semanas cuja média passou do limite (o KPI conta amostras
    // pontuais, por isso os números podem ser diferentes).
    const quantidadePicos = pontosPico.length;
    texto(
        "nota-" + chave,
        quantidadePicos === 0
            ? "Nenhuma média semanal acima de " + limitePico() + "%"
            : quantidadePicos + (quantidadePicos === 1
                ? " semana com média acima de " + limitePico() + "%"
                : " semanas com média acima de " + limitePico() + "%")
    );

    limparEstadoVazio(chave);
    destruirGrafico(chave);

    // Datasets montados na ordem em que aparecem no gráfico.
    const datasets = [];

    // Série do período anterior (linha tracejada). Só existe se a ETL publicou.
    const anteriores = node.comparacao && node.comparacao.series
        ? node.comparacao.series[chave]
        : null;

    if (Array.isArray(anteriores) && anteriores.length) {
        datasets.push({
            label: "Período anterior",
            // Alinhamento por posição: a semana i anterior fica sobre a semana i atual.
            data: anteriores,
            borderColor: componente.corSuave,
            backgroundColor: componente.corSuave,
            borderWidth: 1.5,
            borderDash: [4, 4],
            tension: 0.25,
            pointRadius: 0,
            pointHoverRadius: 3
        });
    }

    // Série atual.
    datasets.push({
        label: "Período selecionado",
        data: medias,
        borderColor: componente.cor,
        backgroundColor: componente.cor,
        borderWidth: 2,
        tension: 0.15,
        pointRadius: 1.6,
        pointHoverRadius: 5,
        pointBackgroundColor: componente.cor,
        pointBorderColor: componente.cor
    });

    // Reta de regressão calculada pela ETL.
    if (linhaRegressao.some(numero)) {
        datasets.push({
            label: "Inclinação da Regressão linear",
            data: linhaRegressao,
            borderColor: CORES_GRAFICO.regressao,
            backgroundColor: CORES_GRAFICO.regressao,
            borderWidth: 2.4,
            tension: 0,
            pointRadius: 0,
            pointHoverRadius: 0
        });
    }

    // Picos como pontos soltos (semanas com média acima do limite).
    datasets.push({
        label: "Média semanal acima de " + limitePico() + "%",
        type: "scatter",
        data: pontosPico,
        backgroundColor: CORES_GRAFICO.pico,
        borderColor: CORES_GRAFICO.pico,
        pointRadius: 4,
        pointHoverRadius: 6
    });

    // Anomalias de resíduo como pontos soltos.
    if (pontosAnomalia.length) {
        datasets.push({
            label: "Anomalia de resíduo",
            type: "scatter",
            data: pontosAnomalia,
            backgroundColor: CORES_GRAFICO.residuo,
            borderColor: CORES_GRAFICO.residuo,
            pointRadius: 4,
            pointHoverRadius: 6
        });
    }

    const canvas = elemento("chart-" + chave);
    graficos[chave] = new Chart(canvas.getContext("2d"), {
        type: "line",
        data: { labels: rotulos, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 8, right: 8 } },
            interaction: { mode: "nearest", intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (contexto) {
                            const valor = contexto.parsed.y;
                            if (valor === null || valor === undefined) {
                                return "";
                            }
                            return contexto.dataset.label + ": " +
                                valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";
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
                    grid: { color: "#f1f3f5", drawBorder: false },
                    border: { display: false }
                },
                x: {
                    grid: { display: false, drawBorder: false },
                    border: { display: false },
                    ticks: {
                        color: "#9ca3af",
                        font: { size: 10 },
                        maxRotation: 0,
                        autoSkip: false,
                        // Mostra apenas alguns rótulos para não poluir o eixo.
                        callback: function (valor, indice) {
                            const passo = Math.max(1, Math.ceil(rotulos.length / 6));
                            return indice % passo === 0 ? this.getLabelForValue(valor) : "";
                        }
                    }
                }
            }
        }
    });
}

/* ---------- 9. CORRELAÇÃO ---------- */

// Monta a equação "y = 0,0577x − 0,37" com o sinal correto no intercepto.
// Sem isso, um intercepto negativo apareceria como "+ -0,37".
function equacaoDaReta(inclinacao, intercepto) {
    const sinal = intercepto < 0 ? "− " : "+ ";
    return "y = " + formatarNumero(inclinacao, 4) + "x " + sinal +
        formatarNumero(Math.abs(intercepto), 2);
}

// Classifica o r em uma etiqueta legível.
function classificarCorrelacao(r) {
    if (!numero(r)) {
        return "Sem dados";
    }
    const forca = Math.abs(r);
    if (forca >= 0.7) {
        return "Correlação forte";
    }
    if (forca >= 0.4) {
        return "Correlação moderada";
    }
    return "Sem correlação relevante";
}

// Atualiza o cartão de correlação (r e etiqueta).
function renderizarCorrelacao(node) {
    const correlacao = node.correlacao || {};
    texto("r-correlacao", numero(correlacao.r) ? formatarNumero(correlacao.r, 2) : "—");
    texto("correlacao-badge", classificarCorrelacao(correlacao.r));

    // Estatísticas do modal (preenchidas mesmo antes de abrir).
    texto("corr-n", numero(correlacao.n) ? correlacao.n.toLocaleString("pt-BR") : "—");
    texto("corr-r", numero(correlacao.r) ? formatarNumero(correlacao.r, 2) : "—");
    texto("corr-r2", numero(correlacao.r2) ? formatarNumero(correlacao.r2, 2) : "—");
    texto(
        "corr-equacao",
        numero(correlacao.inclinacao) && numero(correlacao.intercepto)
            ? equacaoDaReta(correlacao.inclinacao, correlacao.intercepto)
            : "—"
    );

    // Os rótulos dos eixos também vêm do JSON (a ETL sabe o que mediu).
    texto("modal-corr-subtitulo", (correlacao.rotulo_x || "eixo X") + " × " + (correlacao.rotulo_y || "eixo Y"));
}

// Desenha o dispersão do modal com os pontos reais.
function criarGraficoCorrelacao(node) {
    const correlacao = node.correlacao || {};
    const canvas = elemento("chart-correlacao");

    if (!canvas) {
        return;
    }

    destruirGrafico("correlacao");

    const pontos = Array.isArray(correlacao.pontos) ? correlacao.pontos : [];
    const maximoY = Math.max(5, Math.ceil(Math.max(...pontos.map(function (ponto) {
        return numero(ponto.y) ? ponto.y : 0;
    }), 0) * 1.2));

    const conjuntos = [{
        label: "Registros",
        data: pontos,
        backgroundColor: "#2d8ea8",
        borderColor: "#2d8ea8",
        pointRadius: 2.4,
        pointHoverRadius: 4
    }];

    // Reta: usa a inclinação/intercepto calculados pela ETL.
    if (numero(correlacao.inclinacao) && numero(correlacao.intercepto)) {
        conjuntos.push({
            label: "Regressão linear",
            type: "line",
            data: [
                { x: 0, y: correlacao.intercepto },
                { x: 100, y: correlacao.intercepto + correlacao.inclinacao * 100 }
            ],
            borderColor: "#0f3f4d",
            backgroundColor: "#0f3f4d",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0
        });
    }

    graficos.correlacao = new Chart(canvas.getContext("2d"), {
        type: "scatter",
        data: { datasets: conjuntos },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "nearest", intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (contexto) {
                            if (contexto.dataset.type === "line") {
                                return "Regressão linear";
                            }
                            const ponto = contexto.parsed;
                            return "Disco: " + formatarNumero(ponto.x, 1) + "% • IO wait: " +
                                formatarNumero(ponto.y, 2) + "%";
                        }
                    }
                }
            },
            scales: {
                x: {
                    min: 0,
                    max: 100,
                    ticks: { stepSize: 25, color: "#9ca3af", font: { size: 10 } },
                    grid: { color: "#eceff2", drawBorder: false },
                    border: { display: false },
                    title: {
                        display: true,
                        text: correlacao.rotulo_x || "Uso do disco (%)",
                        color: "#6b7480",
                        font: { size: 10, weight: "600" }
                    }
                },
                y: {
                    min: 0,
                    max: maximoY,
                    ticks: { color: "#9ca3af", font: { size: 10 } },
                    grid: { color: "#eceff2", drawBorder: false },
                    border: { display: false },
                    title: {
                        display: true,
                        text: correlacao.rotulo_y || "IO wait da CPU (%)",
                        color: "#6b7480",
                        font: { size: 10, weight: "600" }
                    }
                }
            }
        }
    });
}

/* ---------- 10. RODAPÉ, ESTADO VAZIO E MODAIS ---------- */

// Escreve o rodapé e o subtítulo do gráfico com os dados do período.
function renderizarRodape(node) {
    const rotulos = node.semanas?.rotulos || [];
    const inicio = node.inicio ? formatarDataHora(node.inicio) : rotulos[0] || "—";
    const fim = node.fim ? formatarDataHora(node.fim) : rotulos.at(-1) || "—";

    texto("grafico-subtitulo", "Médias semanais • " + inicio + " — " + fim);

    const kpis = node.kpis || {};
    const comparacao = node.comparacao || {};

    const { atual, anterior, variacao } = podeComparar(node) ? resumirComparacao(comparacao) : {};

    const partes = [
        "Telemetria agregada • " + inicio + " — " + fim +
        " • " + formatarNumero(node.amostras, 0) + " leituras no total"
    ];

    if (numero(atual)) {
        partes.push(
            "Média geral: " + formatarPorcentagem(atual) +
            (numero(anterior) ? " atual × " + formatarPorcentagem(anterior) + " anterior" : "") +
            (numero(variacao) ? " (" + (variacao > 0 ? "+" : "") + formatarNumero(variacao, 1) + "%)" : "")
        );
    }

    // Plural correto: "1 pico de carga" e "14 picos de carga".
    const quantidadePicos = kpis.quantidade_picos || 0;
    partes.push(
        quantidadePicos + (quantidadePicos === 1 ? " pico de carga" : " picos de carga") +
        " (> " + limitePico() + "%)"
    );

    if (kpis.maior_pico && kpis.maior_pico.texto) {
        partes.push("maior pico: " + kpis.maior_pico.texto);
    }

    // Segunda linha do rodapé (o CSS usa white-space: pre-line para respeitar o \n).
    const notaPercentis = "Percentis e durações referem-se às amostras pontuais, não às médias semanais.";

    texto("rodape-telemetria", [partes.join(" • "), notaPercentis, ...avisos].join("\n"));

    const gerado = formatarDataHora(metadados?.gerado_em);
    const ate = formatarDataHora(node.telemetria_ate || metadados?.telemetria_ate);
    texto("status-analista", "Atualizado em " + gerado + " • telemetria até " + ate);
}

// Limpa a tela e mostra uma mensagem única (usado quando não há dados).
function mostrarEstado(mensagem) {
    texto("status-analista", mensagem);
    texto("grafico-subtitulo", "Médias semanais de uso");
    texto("rodape-telemetria", mensagem);
    renderizarPercentis({}, "cpu");

    Object.keys(COMPONENTES).forEach(function (chave) {
        semDados(chave, mensagem);
        texto("media-" + chave, "—");
        texto("nota-" + chave, "—");
    });

    texto("kpi-pico-sub", "—");
    texto("kpi-pico-valor", "—");
    texto("kpi-anomalia-sub", "—");
    texto("kpi-anomalia-valor", "—");
    texto("kpi-picos-total", "—");
    texto("kpi-picos-desc", "—");
    texto("kpi-anomalias-valor", "—");
    texto("kpi-anomalias-desc", "—");
    texto("kpi-duracao-valor", "—");
    texto("kpi-instavel-valor", "—");
    texto("kpi-instavel-desc", "—");
    texto("variation-valor", "—");
    texto("variation-info", mensagem);
    renderizarCorrelacao({});
    destruirGrafico("correlacao");
}

// Desenha a página inteira para o node recebido.
function renderizar(nodePublicado) {
    if (!nodePublicado) {
        mostrarEstado(avisos[0] || "Nenhum node com telemetria publicada para este cluster.");
        return;
    }

    const semanas = nodePublicado.semanas?.datas?.length;
    if (semanas) {
        const opcao = elemento("seletor-periodo").querySelector('option[value="6"]');
        opcao.textContent = semanas === 1 ? "Última semana" : "Últimas " + semanas + " semanas";
    }

    const node = dadosDoPeriodo(nodePublicado);
    if (!node) {
        mostrarEstado("O JSON publicado ainda não inclui este recorte. Reprocesse a Gold com a ETL atualizada.");
        return;
    }
    if (node.amostras === 0) {
        mostrarEstado("Sem leituras para este node no período selecionado.");
        return;
    }

    renderizarKpis(node);
    renderizarPercentis(node, "cpu");
    renderizarCorrelacao(node);

    // Garante que a aba CPU esteja ativa ao trocar de node.
    document.querySelectorAll("#component-tabs .tab").forEach(function (aba) {
        const ativa = aba.dataset.componente === "cpu";
        aba.classList.toggle("active", ativa);
        aba.setAttribute("aria-selected", String(ativa));
    });

    Object.keys(COMPONENTES).forEach(function (chave) {
        criarGraficoComponente(node, chave);
    });

    renderizarRodape(node);
}

// Modais: mesma lógica de abrir/fechar que a página já tinha.
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
    modais.forEach(function (modal) {
        modal.classList.remove("active");
    });
    document.body.style.overflow = "";
}

elemento("btn-ajuda").addEventListener("click", function () {
    abrirModal(elemento("modal-ajuda"));
});

elemento("btn-correlacao").addEventListener("click", function () {
    const node = dadosDoPeriodo(painel?.node);
    if (node && node.amostras !== 0) {
        criarGraficoCorrelacao(node);
    }
    abrirModal(elemento("modal-correlacao"));
});

modais.forEach(function (modal) {
    modal.addEventListener("click", function (evento) {
        if (evento.target === modal) {
            fecharModal(modal);
        }
    });
});

document.querySelectorAll("[data-fechar-modal]").forEach(function (botao) {
    botao.addEventListener("click", function () {
        fecharModal(botao.closest(".dash-modal-overlay"));
    });
});

document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape") {
        fecharTodosOsModais();
    }
});

/* ---------- 11. INICIALIZAÇÃO ---------- */

// Troca de cluster: recarrega a lista de nodes e o primeiro node.
elemento("seletor-cluster").addEventListener("change", function (evento) {
    carregarCluster(evento.target.value);
});

// Troca de node: busca apenas aquele node.
elemento("seletor-node").addEventListener("change", function (evento) {
    carregarNode(elemento("seletor-cluster").value, evento.target.value);
});

// Troca de período: não chama a API, só redesenha com outro recorte.
elemento("seletor-periodo").addEventListener("change", function (evento) {
    periodoAtual = evento.target.value;
    if (painel && painel.node) {
        renderizar(painel.node);
    }
});

ligarAbas();
iniciar();
