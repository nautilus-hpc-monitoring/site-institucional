var express = require("express");
var router = express.Router();
var qtdFuncionarioController = require("../controllers/qtdFuncionarioController");

router.get("/buscarQuantidades/:fkEmpresa", function(req, res) {

    qtdFuncionarioController.buscarQuantidades(req, res);
});

module.exports = router;