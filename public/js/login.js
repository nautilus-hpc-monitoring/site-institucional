function entrar() {
        aguardar();

        var emailVar = email_input.value;
        var senhaVar = senha_input.value;

        if (emailVar == "" || senhaVar == "") {
            div_erros_login.style.color = "red";
            div_erros_login.innerHTML = "Preencha todos os campos para prosseguir.";
            finalizarAguardar();
            setTimeout(sumirMensagem, 5000);
            return false;
        }

        console.log("FORM LOGIN: ", emailVar);
        console.log("FORM SENHA: ", senhaVar);

        fetch("/usuarios/autenticar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                emailServer: emailVar,
                senhaServer: senhaVar
            })
        }).then(function (resposta) {
            console.log("ESTOU NO THEN DO entrar()!");

            if (resposta.ok) {
        
                div_erros_login.style.color = "green";
                div_erros_login.innerHTML = "Login realizado com sucesso! Redirecionando...";

                resposta.json().then(json => {
                    console.log(json);
                    console.log(JSON.stringify(json));
                    sessionStorage.setItem("EMAIL_USUARIO", json.email);
                    sessionStorage.setItem("NOME_USUARIO", json.nome);
                    sessionStorage.setItem("ID_USUARIO", json.id_usuario);
                    sessionStorage.setItem("ID_EMPRESA", json.fk_empresa);
                    sessionStorage.setItem("ID_NIVEL_ACESSO", json.fk_nivel_acesso);
                    
                    setTimeout(function () {
                        window.location = "./cadastro-hpc.html";
                    }, 1000);
                });

            } else {
                console.log("Houve um erro ao tentar realizar o login!");

                resposta.text().then(texto => {
                    console.error(texto);
        
                    div_erros_login.style.color = "red";
                    div_erros_login.innerHTML = texto || "E-mail ou senha incorretos.";
                    finalizarAguardar(texto);
                    setTimeout(sumirMensagem, 5000);
                });
            }

        }).catch(function (erro) {
            console.log(erro);
            
            div_erros_login.style.color = "red";
            div_erros_login.innerHTML = "Erro ao conectar com o servidor.";
            finalizarAguardar();
            setTimeout(sumirMensagem, 5000);
        });

        return false;
    }

    function sumirMensagem() {
        div_erros_login.innerHTML = "";
    }