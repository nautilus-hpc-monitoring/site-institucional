var express = require("express");
var router = express.Router();

var empresaController = require("../controllers/empresaController");

router.get("/baixarAgente/:idEmpresa", (req, res) => {
    empresaController.baixarAgente(req, res);
});

//Recebendo os dados do html e direcionando para a função cadastrar de empresaController.js
router.post("/cadastrar", function (req, res) {
    empresaController.cadastrar(req, res);
})


module.exports = router;