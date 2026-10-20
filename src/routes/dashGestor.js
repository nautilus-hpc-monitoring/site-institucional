var express = require("express");
var router = express.Router();

var dashboardController = require("../controllers/dashGestorController");

router.get("/dados-gestor", function (req, res) {
    dashboardController.buscarDadosGold(req, res);
});

module.exports = router;