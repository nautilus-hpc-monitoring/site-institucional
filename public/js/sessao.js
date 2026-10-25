// sessão
function usuarioLogado() {
    return sessionStorage.getItem("ID_USUARIO") !== null;
}

function protegerPagina() {
    if (!usuarioLogado()) {
        window.location.href = "./login.html";
    }
}

// para páginas que também exibem o nome no elemento #b_usuario
function validarSessao() {
    if (!usuarioLogado()) {
        window.location.href = "./login.html";
        return;
    }

    var b_usuario = document.getElementById("b_usuario");
    if (b_usuario) {
        b_usuario.innerHTML = sessionStorage.getItem("NOME_USUARIO");
    }
}

function encerrarSessao() {
    sessionStorage.clear();
    window.location.href = "./login.html";
}

function exibirNomeUsuario(idElemento = "nome-usuario") {
    const nome = sessionStorage.getItem("NOME_USUARIO");
    const el = document.getElementById(idElemento);
    if (nome && el) el.textContent = nome;
}

// carregamento (loading)
function aguardar() {
    var divAguardar = document.getElementById("div_aguardar");
    divAguardar.style.display = "flex";
}

function finalizarAguardar(texto) {
    var divAguardar = document.getElementById("div_aguardar");
    divAguardar.style.display = "none";

    var divErrosLogin = document.getElementById("div_erros_login");
    if (texto) {
        divErrosLogin.style.display = "flex";
        divErrosLogin.innerHTML = texto;
    }
}