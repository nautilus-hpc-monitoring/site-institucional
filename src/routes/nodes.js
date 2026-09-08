var express = require("express");

var router = express.Router();

var nodesController = require("../controllers/nodesController");

router.post("/cadastrar", function(req, res) {

    nodesController.cadastrar(req, res);

});

router.post("/chamarHPC", function(req, res) {

    nodesController.chamarHPC(req, res);

});

router.post("/chamarCluster", function(req, res) {

    nodesController.chamarCluster(req, res);

});

router.post("/ativarAgente", function(req, res) {
    nodesController.ativarAgente(req, res);
});

module.exports = router;