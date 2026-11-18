// Ordem = ordem das colunas da tabela.
const CATEGORIAS = [
    { id: 1, rotulo: "Pressão de processamento",  cor: "#00747f" },
    { id: 2, rotulo: "Degradação de memória", cor: "#25a0a8" },
    { id: 3, rotulo: "Degradação de disco",             cor: "#e0a84a" },
    { id: 4, rotulo: "Pressão combinada", cor: "#b8606a" }
];
const NODES_VAZIOS = 6; // linhas exibidas na tabela enquanto não há dados

// Rotas da API (ajuste quando o endpoint do S3 estiver pronto).
const ROTAS = {
    catalogo: "/dashcategorica/clusters",
    dados: (id) => "/dashcategorica/clusters/" + encodeURIComponent(id) + "/dados"
};

const MODO_ESTRUTURA = true;

const elemento = (id) => document.getElementById(id);
const numero = (v) => typeof v === "number" && Number.isFinite(v);
const formatar = (v) =>
    numero(v) ? v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—";
const ouTraco = (v) => (v === null || v === undefined ? "—" : v);

// Distingue a atualização dos dados da hora em que a página os consultou.
function formatarDataHora(valor) {
    const data = new Date(valor);
    if (!valor || !Number.isFinite(data.getTime())) return "indisponível";
    return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

let catalogo = [],
    painel = null,
    requisicao = null,
    versao = 0;

// Escreve um valor em um elemento da página.
function texto(id, valor) {
    elemento(id).textContent = valor;
}

// Cria um elemento com classe e texto opcionais.
function criar(tag, classe, conteudo) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (conteudo !== undefined) e.textContent = conteudo;
    return e;
}

// ESTRUTURA VAZIA — números = 0, textos = null.
function categoriasVazias() {
    return Object.fromEntries(CATEGORIAS.map((c) => [c.id, 0]));
}
function nodeVazio() {
    return {
        hostname: null,
        cluster_nome: null,
        total: 0,
        categorias: categoriasVazias()
    };
}
function dadosVazios() {
    return {
        gerado_em: null,
        coleta_ate: null,
        avisos: [],
        nodes: Array.from({ length: NODES_VAZIOS }, nodeVazio)
    };
}

// Garante o formato esperado: números inválidos viram 0 e textos ausentes viram null.
function normalizar(bruto) {
    const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const str = (v) => (v === undefined || v === null ? null : String(v));
    if (!bruto) return dadosVazios();
    return {
        gerado_em: str(bruto.gerado_em),
        coleta_ate: str(bruto.coleta_ate),
        avisos: Array.isArray(bruto.avisos) ? bruto.avisos : [],
        nodes: (bruto.nodes || []).map((n) => {
            const categorias = categoriasVazias();
            CATEGORIAS.forEach((c) => {
                categorias[c.id] = num(n.categorias?.[c.id]);
            });
            const soma = CATEGORIAS.reduce((s, c) => s + categorias[c.id], 0);
            return {
                hostname: str(n.hostname),
                cluster_nome: str(n.cluster_nome),
                total: num(n.total) || soma,
                categorias
            };
        })
    };
}

// Soma de cada categoria em todos os nodes.
function somarCategorias(nodes) {
    const soma = categoriasVazias();
    nodes.forEach((n) => CATEGORIAS.forEach((c) => (soma[c.id] += n.categorias[c.id])));
    return soma;
}

// Esvazia a tabela antes de trocar o cluster.
function limparTela() {
    ["cat-table-head", "node-rows", "cat-table-foot"].forEach((id) =>
        elemento(id).replaceChildren()
    );
}

// Atualiza a mensagem de carregamento e a visibilidade da dashboard.
function estado(mensagem, ocultar = false) {
    texto("connection-status", mensagem);
    elemento("empty-state").hidden = !ocultar;
    elemento("cat-kpis").hidden = ocultar;
    elemento("cat-table-card").hidden = ocultar;
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

// PONTOS DE INTEGRAÇÃO — trocam a estrutura vazia pela API/S3.
async function buscarCatalogo() {
    if (MODO_ESTRUTURA)
        return [{ hpc_id: null, hpc_nome: null, cluster_id: null, cluster_nome: null }];
    return api(ROTAS.catalogo);
}
async function buscarDados(idCluster, signal) {
    if (MODO_ESTRUTURA) return dadosVazios();
    return api(ROTAS.dados(idCluster), signal);
}

// Preenche os seletores de HPC e cluster.
function opcoes(select, lista) {
    select.replaceChildren(
        ...lista.map((v) => new Option(ouTraco(v.nome), String(v.id ?? "")))
    );
    select.disabled = !lista.length;
}

// Mostra os clusters do HPC selecionado.
function atualizarClusters() {
    opcoes(
        elemento("cluster-select"),
        catalogo
            .filter((c) => String(c.hpc_id ?? "") === elemento("hpc-select").value)
            .map((c) => ({ id: c.cluster_id, nome: c.cluster_nome }))
    );
    carregarCluster();
}

// KPIs: node mais problemático e categoria mais comum.
// KPIs: node mais problemático, categoria mais comum e categoria mais severa.
function cards(data) {
    const soma = somarCategorias(data.nodes);
    const total = CATEGORIAS.reduce((s, c) => s + soma[c.id], 0);
    const n = [...data.nodes].sort((a, b) => b.total - a.total)[0];
    const cat =
        total > 0
            ? CATEGORIAS.reduce((a, b) => (soma[b.id] > soma[a.id] ? b : a))
            : null;

    texto("top-node-name", ouTraco(n?.hostname));
    texto("top-node-count", formatar(n ? n.total : 0));

    texto("top-category-name", cat ? cat.rotulo : "—");
    texto("top-category-count", formatar(cat ? soma[cat.id] : 0));
    texto("cat-total", formatar(total) + " episódios");

    // Severidade = episódios da categoria × peso da categoria.
    const severidade = CATEGORIAS.map((c) => ({ ...c, pontos: soma[c.id] * c.peso }));
    const pontosTotal = severidade.reduce((s, c) => s + c.pontos, 0);
    const grave =
        pontosTotal > 0
            ? severidade.reduce((a, b) => (b.pontos > a.pontos ? b : a))
            : null;
    const pontos = grave ? grave.pontos : 0;

    texto("top-severity-name", grave ? grave.rotulo : "—");
    texto("top-severity-points", formatar(pontos));
    texto("top-severity-label", pontos === 1 ? "ponto de severidade" : "pontos de severidade");
}

// TABELA — Cabeçalho com uma coluna por categoria.
function renderizarCabecalho() {
    const tr = document.createElement("tr");
    tr.appendChild(criar("th", "", "Node")).scope = "col";
    CATEGORIAS.forEach((c) => {
        const th = document.createElement("th");
        th.scope = "col";
        const rotulo = criar("span", "cat-th-label");
        const ponto = criar("i", "cat-dot");
        ponto.style.background = c.cor;
        ponto.setAttribute("aria-hidden", "true");
        rotulo.append(ponto, document.createTextNode(c.rotulo));
        th.appendChild(rotulo);
        tr.appendChild(th);
    });
    tr.appendChild(criar("th", "", "Total")).scope = "col";
    elemento("cat-table-head").replaceChildren(tr);
}

// TABELA — Uma linha por node, do mais para o menos problemático.
function renderizarLinhas(lista) {
    const nodes = [...lista].sort((a, b) => b.total - a.total);
    elemento("node-rows").replaceChildren(
        ...nodes.map((n, i) => {
            const tr = document.createElement("tr");

            const th = document.createElement("th");
            th.scope = "row";
            const celula = criar("div", "cat-node-cell");
            const icone = criar("span", "cat-node-icon");
            icone.setAttribute("aria-hidden", "true");
            icone.innerHTML = '<i class="fa-solid fa-server"></i>';
            const titulo = criar("div", "cat-node-title");
            titulo.append(
                criar("span", "cat-node-name", ouTraco(n.hostname)),
                criar("span", "cat-node-cluster", ouTraco(n.cluster_nome))
            );
            celula.append(icone, titulo);
            th.appendChild(celula);
            tr.appendChild(th);

            CATEGORIAS.forEach((c) => {
                const valor = n.categorias[c.id];
                tr.appendChild(criar("td", valor === 0 ? "is-zero" : "", formatar(valor)));
            });

            const td = document.createElement("td");
            td.appendChild(
                criar(
                    "span",
                    "cat-node-total" + (i === 0 && n.total > 0 ? " cat-node-total--alert" : ""),
                    formatar(n.total)
                )
            );
            tr.appendChild(td);
            return tr;
        })
    );
}

// TABELA — Linha de total por categoria.
function renderizarTotais(nodes) {
    const soma = somarCategorias(nodes);
    const tr = document.createElement("tr");
    tr.appendChild(criar("td", "", "Total"));
    CATEGORIAS.forEach((c) => tr.appendChild(criar("td", "", formatar(soma[c.id]))));
    tr.appendChild(
        criar("td", "", formatar(CATEGORIAS.reduce((s, c) => s + soma[c.id], 0)))
    );
    elemento("cat-table-foot").replaceChildren(tr);
}

// CARREGAMENTO — Busca os dados, preenche KPIs e monta a tabela.
async function carregarCluster() {
    requisicao?.abort();
    requisicao = new AbortController();
    const atual = ++versao;
    limparTela();
    const select = elemento("cluster-select");
    if (!select.options.length) {
        estado("Nenhum cluster disponível.", true);
        return;
    }
    estado("Carregando dados…", true);
    try {
        const data = normalizar(await buscarDados(select.value, requisicao.signal));
        if (atual !== versao) return;
        painel = data;
        cards(data);
        renderizarCabecalho();
        renderizarLinhas(data.nodes);
        renderizarTotais(data.nodes);
        estado(data.avisos.length ? data.avisos.join(" ") : "Dados do banco e S3");
        const nomeados = data.nodes.filter((n) => n.hostname !== null).length;
        texto(
            "cluster-summary",
            nomeados ? nomeados + (nomeados === 1 ? " node" : " nodes") : "— nodes"
        );
        texto(
            "data-time",
            "Coleta: " +
                formatarDataHora(data.coleta_ate) +
                " · Consulta: " +
                formatarDataHora(data.gerado_em)
        );
    } catch (e) {
        if (e.name !== "AbortError" && atual === versao) {
            limparTela();
            estado(e.message, true);
        }
    }
}

// EVENTOS — Seletores e botão de nova tentativa.
elemento("hpc-select").addEventListener("change", atualizarClusters);
elemento("cluster-select").addEventListener("change", carregarCluster);
elemento("restore-cluster").addEventListener("click", () =>
    catalogo.length ? carregarCluster() : iniciar()
);

// INÍCIO — Busca os HPCs e clusters disponíveis ao abrir a página.
async function iniciar() {
    estado("Carregando ambientes…", true);
    try {
        catalogo = await buscarCatalogo();
        const ambientes = [
            ...new Map(
                catalogo.map((c) => [
                    c.hpc_id ?? "",
                    { id: c.hpc_id, nome: c.hpc_nome }
                ])
            ).values()
        ];
        opcoes(elemento("hpc-select"), ambientes);
        atualizarClusters();
    } catch (e) {
        estado(e.message, true);
    }
}
iniciar();