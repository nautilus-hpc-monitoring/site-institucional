var express = require("express");
var router = express.Router();

var usuarioController = require("../controllers/relatorioController");

router.post("/buscarRelatorio:nome", function (req, res) {
    relatorioController.buscarRelatorio(req, res);
})