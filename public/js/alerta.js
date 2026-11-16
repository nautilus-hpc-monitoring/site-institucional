
const htmlAlertas = document.getElementById("lista-alertas");
const htmlBuscaServidor = document.getElementById("buscar-servidor");
const htmlFiltroStatus = document.getElementById("filtro-status");
const htmlMensagem = document.getElementById("mensagem-alertas");
const htmlAtualizar = document.getElementById("atualizar-alertas");
const htmlCarregarMais = document.getElementById("mais-alertas");
const mobileSidebar = document.getElementById("mobileSidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");

let paginaAtual = 0;
let totalExibido = 0;
let carregando = false;

if (sessionStorage.NOME_USUARIO) {
    document.getElementById("b_usuario").textContent = sessionStorage.NOME_USUARIO;
    document.getElementById("b_usuario_mobile").textContent = sessionStorage.NOME_USUARIO;
}

document.getElementById("open-sidebar-btn").onclick = function () {
    mobileSidebar.classList.add("active");
    sidebarOverlay.classList.add("active");
};

document.getElementById("close-sidebar-btn").onclick = fecharMenu;
sidebarOverlay.onclick = fecharMenu;

function fecharMenu() {
    mobileSidebar.classList.remove("active");
    sidebarOverlay.classList.remove("active");
}


htmlBuscaServidor.onchange = filtrarAlertas;
htmlFiltroStatus.onchange = filtrarAlertas;
htmlAtualizar.onclick = filtrarAlertas;
htmlCarregarMais.onclick = function () {
    carregarAlertas(paginaAtual + 1);
};

function filtrarAlertas() {
    return carregarAlertas(1);
}

// Busca uma página de alertas. A API identifica a empresa pela sessão do login.
function carregarAlertas(pagina) {
    if (carregando) return;
    alterarCarregamento(true);
    htmlMensagem.textContent = "Carregando alertas…";

    if (pagina === 1) {
        htmlAlertas.innerHTML = "";
        htmlCarregarMais.hidden = true;
        totalExibido = 0;
    }

    const servidor = encodeURIComponent(htmlBuscaServidor.value.trim());
    const status = encodeURIComponent(htmlFiltroStatus.value);
    const url = `/alertas?servidor=${servidor}&status=${status}&pagina=${pagina}`;

    return fetch(url, { credentials: "same-origin", cache: "no-store" })
        .then(function (resposta) {
            if (resposta.status === 401) {
                window.location.href = "./login.html";
                throw new Error("Entre novamente para consultar os alertas.");
            }
            return resposta.json().then(function (dados) {
                if (!resposta.ok) throw new Error(dados.erro || "Erro ao buscar alertas.");
                if (!Array.isArray(dados.alertas)) throw new Error("Resposta de alertas inválida.");
                return dados;
            });
        })
        .then(function (dados) {
            exibirAlertas(dados.alertas);
            paginaAtual = pagina;
            totalExibido += dados.alertas.length;
            htmlCarregarMais.hidden = !dados.temMais;
            htmlMensagem.textContent = totalExibido === 0
                ? "Nenhum alerta encontrado com esses filtros."
                : `${totalExibido} alerta(s) exibido(s), do mais recente ao mais antigo.`;
        })
        .catch(function (erro) {
            htmlMensagem.textContent = erro.message + " Use Atualizar para tentar novamente.";
        })
        .finally(function () {
            alterarCarregamento(false);
        });
}

// Desabilita os filtros enquanto a consulta acontece para evitar buscas sobrepostas.
function alterarCarregamento(valor) {
    carregando = valor;
    htmlBuscaServidor.disabled = valor;
    htmlFiltroStatus.disabled = valor;
    htmlAtualizar.disabled = valor;
    htmlCarregarMais.disabled = valor;
}

// Monta as linhas, como os itens de ambientes e nodes na dashboard do operador.
function exibirAlertas(alertas) {
    const nomesStatus = {
        aberto: "Em aberto",
        em_andamento: "Em andamento",
        resolvido: "Resolvido",
        fechado: "Fechado"
    };
    let linhas = "";

    alertas.forEach(alerta => {
        let classeStatus = "badge-status";
        if (alerta.status === "aberto") classeStatus = "badge-status-alert";
        if (alerta.status === "em_andamento") classeStatus = "badge-status-attention";
        const nomeStatus = nomesStatus[alerta.status] || "Não informado";

        linhas += `
            <tr>
                <td><strong>${escaparHtml(alerta.servidor)}</strong></td>
                <td>${escaparHtml(alerta.componente)}</td>
                <td title="${escaparHtml(alerta.descricao)}">${escaparHtml(alerta.titulo || alerta.descricao)}</td>
                <td>${escaparHtml(formatarData(alerta.data_hora))}</td>
                <td><span class="${classeStatus}">${nomeStatus}</span></td>
            </tr>
        `;
    });

    htmlAlertas.innerHTML += linhas;
}

function formatarData(valor) {
    if (!valor) return "—";
    // O banco entrega AAAA-MM-DD HH:mm:ss. Mantém o horário gravado.
    const partes = valor.split(" ");
    if (partes.length !== 2) return "—";
    const data = partes[0].split("-");
    return `${data[2]}/${data[1]}/${data[0]} - ${partes[1].substring(0, 5)}`;
}

// Ao usar template strings, escapa o texto do banco antes de inserir no HTML.
function escaparHtml(valor) {
    if (valor === null || valor === undefined || valor === "") return "—";
    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function encerrarSessao() {
    return fetch("/dashcluster/sair", { method: "POST", credentials: "same-origin" })
        .catch(function () {
            htmlMensagem.textContent = "Não foi possível encerrar a sessão no servidor.";
        })
        .finally(function () {
            sessionStorage.clear();
            window.location.href = "./login.html";
        });
}

carregarAlertas(1);
