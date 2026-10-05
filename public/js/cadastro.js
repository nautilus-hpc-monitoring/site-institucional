 function cadastrar() {
        var nomeVar = nome_input.value;
        var cpfVar = cpf_input.value;
        var emailVar = email_input.value;
        var senhaVar = senha_input.value;
        var confirmacaoSenhaVar = confirmacao_senha_input.value;

        if (nomeVar == "" || cpfVar == "" || emailVar == "" || senhaVar == "" || confirmacaoSenhaVar == "") {
            div_erros_login.style.color = "red";
            div_erros_login.innerHTML = "Preencha todos os campos para prosseguir.";
            setTimeout(sumirMensagem, 5000);
            return false;
        }

        if (senhaVar != confirmacaoSenhaVar) {
            div_erros_login.style.color = "red";
            div_erros_login.innerHTML = "As senhas inseridas não coincidem.";
            setTimeout(sumirMensagem, 5000);
            return false;
        }

        fetch("/usuarios/cadastrar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nomeServer: nomeVar,
                emailServer: emailVar,
                senhaServer: senhaVar,
                cpfServer: cpfVar
            })
        }).then(function (resposta) {

            if (resposta.ok) {
                div_erros_login.style.color = "green";
                div_erros_login.innerHTML = "Cadastro efetuado com sucesso!";

                modal_email.style.display = "flex";

            } else {
                resposta.text().then(texto => {
                    div_erros_login.style.color = "red";
                    div_erros_login.innerHTML = texto || "Erro ao realizar o cadastro.";
                    setTimeout(sumirMensagem, 5000);
                    console.error(texto);
                });
            }

        }).catch(function (erro) {
            div_erros_login.style.color = "red";
            div_erros_login.innerHTML = "Erro de conexão com o servidor.";
            setTimeout(sumirMensagem, 5000);
            console.log(erro);
        });

        return false;
    }

    function fecharModalERedirecionar() {
        modal_email.style.display = "none";
        window.location = "./login.html";
    }

    function sumirMensagem() {
        div_erros_login.innerHTML = "";
    }