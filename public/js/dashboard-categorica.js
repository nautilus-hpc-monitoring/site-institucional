// Ordem = ordem das colunas da tabela.
const CATEGORIAS = [
    { id: 1, rotulo: "Pressão de processamento", cor: "#00747f", chaves: ["pressao de processamento", "pressao processamento", "pressao_processamento", "processamento"] },
    { id: 2, rotulo: "Degradação de memória", cor: "#25a0a8", chaves: ["degradacao de memoria", "degradacao memoria", "degradacao_memoria", "memoria"] },
    { id: 3, rotulo: "Degradação de disco", cor: "#e0a84a", chaves: ["degradacao de disco", "degradacao disco", "degradacao_disco", "disco"] },
    { id: 4, rotulo: "Pressão combinada", cor: "#b8606a", chaves: ["pressao combinada", "pressao_combinada", "combinada"] }
];
const NODES_VAZIOS = 6; // linhas exibidas na tabela enquanto não há dados
const TODOS = "Todos os nodes";

// Rotas da API — o id do usuário e os ids de escopo fazem parte do path.
const ROTAS = {
    filtros: (idUsuario) =>
        "/dashcategorica/buscarFiltros/" + encodeURIComponent(idUsuario),
    todos: (idUsuario) =>
        "/dashcategorica/buscarNodes/" + encodeURIComponent(idUsuario),
    porHpc: (idUsuario, idHpc) =>
        "/dashcategorica/buscarPorHpc/" + encodeURIComponent(idUsuario) + "/" +
        encodeURIComponent(idHpc),
    porCluster: (idUsuario, idCluster) =>
        "/dashcategorica/buscarPorCluster/" + encodeURIComponent(idUsuario) + "/" +
        encodeURIComponent(idCluster)
};

const elemento = (id) => document.getElementById(id);
const numero = (v) => typeof v === "number" && Number.isFinite(v);
const formatar = (v) =>
    numero(v) ? v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—";
const ouTraco = (v) => (v === null || v === undefined ? "—" : v);

// Compara nomes de categoria do S3 com os rótulos das colunas fixas.
function chaveCategoria(nome) {
    return String(nome ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[_/-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function categoriaPorNome(nome) {
    const chave = chaveCategoria(nome);
    return (
        CATEGORIAS.find((c) =>
            [c.rotulo, ...c.chaves].some((alias) => chaveCategoria(alias) === chave)
        ) || null
    );
}
function idCategoria(nome, indice, avisos) {
    const encontrada = categoriaPorNome(nome);
    if (encontrada) return encontrada.id;
    if (indice < CATEGORIAS.length) {
        avisos.push('Categoria "' + nome + '" exibida como "' + CATEGORIAS[indice].rotulo + '".');
        return CATEGORIAS[indice].id;
    }
    avisos.push('Categoria "' + nome + '" sem coluna correspondente.');
    return null;
}

// Distingue a atualização dos dados da hora em que a página os consultou.
function formatarDataHora(valor) {
    const data = new Date(valor);
    if (!valor || !Number.isFinite(data.getTime())) return "indisponível";
    return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

let catalogo = [],
    painel = null,
    requisicao = null,
    versao = 0,
    escopo = TODOS;

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

// Converte o catálogo de filtros do banco para o formato usado nos selects.
function normalizarCatalogo(linhas) {
    return (linhas || []).map((c) => ({
        hpc_id: c.id_ambiente_hpc,
        hpc_nome: c.nome_hpc,
        cluster_id: c.id_cluster,
        cluster_nome: c.nome_cluster
    }));
}
function rotuloDoCatalogo(campoId, campoNome, id) {
    return (
        catalogo.find((c) => String(c[campoId]) === String(id))?.[campoNome] || TODOS
    );
}

// Converte o payload agregado do backend para o formato da tela.
function normalizar(bruto, rotulo) {
    const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const str = (v) => (v === undefined || v === null ? null : String(v));
    if (!bruto) return dadosVazios();

    const avisos = Array.isArray(bruto.avisos) ? bruto.avisos.map(String) : [];
    const categorias = Array.isArray(bruto.categorias) ? bruto.categorias : [];
    const matriz = bruto.matriz_categoria_node || {};
    const ids = new Map(
        categorias.map((c, i) => [c?.nome, idCategoria(c?.nome, i, avisos)])
    );
    const nodes = (bruto.nodes || []).map((n) => {
        const contagem = categoriasVazias();
        categorias.forEach((c) => {
            const id = ids.get(c?.nome);
            if (id !== null && id !== undefined) {
                contagem[id] += num(matriz[c?.nome]?.[n?.hostname]);
            }
        });
        const soma = CATEGORIAS.reduce((s, c) => s + contagem[c.id], 0);
        return {
            hostname: str(n?.hostname),
            cluster_nome: str(rotulo),
            total: num(n?.quantidade_episodios) || soma,
            categorias: contagem
        };
    });
    const metadados = bruto.metadados || {};
    return {
        gerado_em: str(bruto.gerado_em ?? metadados.gerado_em),
        coleta_ate: str(bruto.coleta_ate ?? metadados.coleta_ate),
        avisos,
        indicadores: bruto.indicadores || {},
        nodes
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
    const r = await fetch(url, { signal, cache: "no-store" });
    if (r.status === 401) {
        location.href = "./login.html";
        throw Error("Entre novamente.");
    }
    const data = await r.json();
    if (!r.ok) throw Error(data.erro || data.mensagem || "Falha ao consultar dados.");
    return data;
}

async function buscarFiltros() {
    return api(ROTAS.filtros(sessionStorage.getItem("ID_USUARIO")));
}

// Escolhe a rota conforme os filtros: cluster > HPC > todos os nodes da empresa.
async function buscarDados(signal) {
    const idUsuario = sessionStorage.getItem("ID_USUARIO");
    const idCluster = elemento("cluster-select").value;
    const idHpc = elemento("hpc-select").value;

    if (idCluster) {
        escopo = rotuloDoCatalogo("cluster_id", "cluster_nome", idCluster);
        return api(ROTAS.porCluster(idUsuario, idCluster), signal);
    }
    if (idHpc) {
        escopo = rotuloDoCatalogo("hpc_id", "hpc_nome", idHpc);
        return api(ROTAS.porHpc(idUsuario, idHpc), signal);
    }
    escopo = TODOS;
    return api(ROTAS.todos(idUsuario), signal);
}

// Preenche os seletores, mantendo a opção de não aplicar filtro.
function opcoes(select, lista) {
    select.replaceChildren(
        new Option(TODOS, ""),
        ...lista.map((v) => new Option(ouTraco(v.nome), String(v.id ?? "")))
    );
    select.disabled = false;
}

// Mostra os clusters do HPC selecionado (todos quando não há HPC escolhido).
function atualizarClusters() {
    const idHpc = elemento("hpc-select").value;
    opcoes(
        elemento("cluster-select"),
        catalogo
            .filter((c) => !idHpc || String(c.hpc_id ?? "") === idHpc)
            .map((c) => ({ id: c.cluster_id, nome: c.cluster_nome }))
    );
    elemento("cluster-select").value = "";
    carregarDados();
}

// KPIs: node mais problemático, categoria mais comum e categoria mais severa.
function cards(data) {
    const indicadores = data.indicadores || {};
    const soma = somarCategorias(data.nodes);
    const total = indicadores.total_episodios ?? CATEGORIAS.reduce((s, c) => s + soma[c.id], 0);
    const piorNode = indicadores.node_mais_problematico || null;
    const comum = indicadores.categoria_mais_comum || null;
    const severa = indicadores.categoria_mais_severa || null;
    const comumCat = comum ? categoriaPorNome(comum.nome) : null;
    const severaCat = severa ? categoriaPorNome(severa.nome) : null;
    const pontos = severa && numero(severa.pontos_max) ? severa.pontos_max : NaN;

    texto("top-node-name", ouTraco(piorNode ? piorNode.hostname : data.nodes[0]?.hostname));
    texto(
        "top-node-count",
        formatar(piorNode ? piorNode.quantidade_episodios : data.nodes[0]?.total ?? 0)
    );

    texto("top-category-name", comum ? comumCat?.rotulo || comum.nome : "—");
    texto("top-category-count", formatar(comum ? comum.quantidade_episodios : 0));
    texto("cat-total", formatar(total) + " episódios");

    texto("top-severity-name", severa ? severaCat?.rotulo || severa.nome : "—");
    texto("top-severity-points", formatar(pontos));
    texto(
        "top-severity-label",
        (severa?.classificacao ? severa.classificacao.toLowerCase() + " • " : "")
            + (pontos === 1 ? "ponto de severidade" : "pontos de severidade")
    );
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
async function carregarDados() {
    requisicao?.abort();
    requisicao = new AbortController();
    const atual = ++versao;
    limparTela();
    estado("Carregando dados…", true);
    try {
        const bruto = await buscarDados(requisicao.signal);
        if (atual !== versao) return;
        const data = normalizar(bruto, escopo);
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
elemento("cluster-select").addEventListener("change", carregarDados);
elemento("restore-cluster").addEventListener("click", () =>
    catalogo.length ? carregarDados() : iniciar()
);

// INÍCIO — Busca os HPCs e clusters disponíveis ao abrir a página.
async function iniciar() {
    estado("Carregando ambientes…", true);
    try {
        catalogo = normalizarCatalogo(await buscarFiltros());
        const ambientes = [
            ...new Map(
                catalogo.map((c) => [String(c.hpc_id), { id: c.hpc_id, nome: c.hpc_nome }])
            ).values()
        ];
        opcoes(elemento("hpc-select"), ambientes);
        elemento("hpc-select").value = "";
        atualizarClusters();
    } catch (e) {
        estado(e.message, true);
    }
}
iniciar();
