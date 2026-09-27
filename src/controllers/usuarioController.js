var usuarioModel = require("../models/usuarioModel");
var empresaModel = require("../models/empresaModel");
var verificacaoModel = require("../models/verificacaoModel");
var emailService = require("../services/emailService");
var bcrypt = require("bcrypt");
var crypto = require("crypto");

async function autenticar(req, res) {

    var email = req.body.emailServer;
    var senha = req.body.senhaServer;

    if (email == undefined) {
        return res.status(400).send("Seu email está indefinido!");

    } else if (senha == undefined) {
        return res.status(400).send("Sua senha está indefinida!");
    }

    try {

        const resposta = await usuarioModel.buscarPorEmail(email);
        
        const usuario = resposta[0];

        if (!usuario) {
            return res.status(401).send("Email inválido");
        }

        //if (!usuario.verificado) {
          //  return res.status(403).send("Email não verificado");
        //}


        const senhaValida = await bcrypt.compare(senha, usuario.senha);

        if (!senhaValida) {
            return res.status(401).send("Senha inválida");
        }

        res.json({
            id_usuario: usuario.id,
            email: usuario.email,
            nome: usuario.nome,
            fk_empresa: usuario.fk_empresa
        });

    } catch (erro) {

        console.log(erro);

        res.status(500).json(erro.sqlMessage);
    }
}

function cadastrar(req, res) {

    var nome = req.body.nomeServer;
    var email = req.body.emailServer;
    var senha = req.body.senhaServer;
    var cpf = req.body.cpfServer;
    var fk_nivel_acesso = 1;


    if (nome == undefined) {

        return res.status(400).send("Seu nome está undefined!");

    } else if (email == undefined) {

        return res.status(400).send("Seu email está undefined!");

    } else if (senha == undefined) {

        return res.status(400).send("Sua senha está undefined!");

    } else if (cpf == undefined) {

        return res.status(400).send("Seu CPF está undefined!");

    }

    var regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!regexEmail.test(email)) {

        return res.status(400).send("Digite um email válido!");

    }


    var dominio = email.split("@")[1];


    empresaModel.buscarDominio(dominio)

        .then(function (empresa) {

            if (!empresa) {

                return res.status(404).send("Domínio de empresa não encontrado!");

            }


            var cpfRegex = /^\d{11}$/;

            if (!cpfRegex.test(cpf)) {

                return res.status(400).send("Digite um CPF válido!");

            }


            var senhaRegex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;

            if (!senhaRegex.test(senha)) {

                return res.status(400).send(
                    "A senha deve conter ao menos 8 caracteres, uma letra maiúscula, um número e um caractere especial!"
                );

            }


            return bcrypt.hash(senha, 10)

                .then(function (senhaHash) {

                    return usuarioModel.cadastrar(
                        nome,
                        email,
                        senhaHash,
                        cpf,
                        fk_nivel_acesso
                    );

                })

                .then(function (resultado) {

                    var token = crypto.randomBytes(32).toString("hex");

                    var dtExpiracao = new Date(
                        Date.now() + 15 * 60 * 1000
                    );


                    return verificacaoModel.criarToken(
                        token,
                        dtExpiracao,
                        resultado.insertId
                    )

                        .then(function () {

                            return emailService.enviarEmail(
                                email,
                                token
                            );

                        });

                })

                .then(function () {

                    res.status(201).json({
                        mensagem: "Usuário cadastrado com sucesso!"
                    });

                });

        })

        .catch(function (erro) {

            console.log(erro);

            console.log(
                "\nHouve um erro ao realizar o cadastro! Erro: ",
                erro.sqlMessage
            );

            res.status(500).json(erro.sqlMessage);

        });

}

module.exports = {
    autenticar,
    cadastrar
}