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
            id_usuario: usuario.id_usuario,
            email: usuario.email_institucional,
            nome: usuario.nome,
            fk_empresa: usuario.fk_empresa
        });

    } catch (erro) {

        console.log(erro);

        res.status(500).json(erro.sqlMessage);
    }
}

async function cadastrar(req, res) {
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

    var dominio = email.split("@")[1];

    try {
        // Primeiro identifica a empresa pelo domínio do email.
        const empresas = await empresaModel.buscarDominio(dominio);
        if (!empresas || empresas.length === 0) {
            return res.status(404).json({ erro: "Domínio de empresa não encontrado!" });
        }

        let empresa = empresas;
        if (Array.isArray(empresas)) {
            empresa = empresas[0];
        }

        const senhaHash = await bcrypt.hash(senha, 10);
        const resultado = await usuarioModel.cadastrar(
            nome,
            email,
            senhaHash,
            cpf,
            empresa.id_empresa,
            fk_nivel_acesso
        );

        // Só cria a verificação depois de receber o ID do usuário salvo no banco.
        if (!resultado || !Number.isInteger(resultado.insertId) || resultado.insertId <= 0) {
            throw new Error("O cadastro não retornou um ID de usuário válido.");
        }

        const token = crypto.randomBytes(32).toString("hex");
        const dataExpiracao = new Date(Date.now() + 15 * 60 * 1000)
            .toISOString()
            .slice(0, 19)
            .replace("T", " ");

        await verificacaoModel.criarToken(token, dataExpiracao, resultado.insertId);
        await emailService.enviarEmail(email, token);

        return res.status(201).json({
            mensagem: "Usuário cadastrado com sucesso!"
        });
    } catch (erro) {
        console.log(erro);
        return res.status(erro.status || 500).json({
            erro: erro.sqlMessage || erro.message
        });
    }
}

module.exports = {
    autenticar,
    cadastrar
}
