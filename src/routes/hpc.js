var express = require("express");
var router = express.Router();

var hpcController = require("../controllers/hpcController");

// HPC
router.post("/listarHPC", function (req, res) {
    hpcController.listarHPC(req, res);
})

router.post("/cadastrarHPC", function (req, res) {
    hpcController.cadastrarHPC(req, res);
})

router.post("/deletarHPC", function (req, res) {
    hpcController.deletarHPC(req, res);
});

router.post("/editarHPC", function (req, res) {
    hpcController.editarHPC(req, res);
})

// Cluster
router.post("/listarClusters", function (req, res) {
    hpcController.listarClusters(req, res);
})

router.post("/cadastrarCluster", function (req, res) {
    hpcController.cadastrarCluster(req, res);
})

router.post("/editarCluster", function (req, res) {
    hpcController.editarCluster(req, res);
})
router.post("/deletarCluster", function (req, res) {
    hpcController.deletarCluster(req, res);
});

// Node
router.post("/listarNodes", function (req, res) {
    hpcController.listarNodes(req, res);
})

router.post("/buscarNode", function (req, res) {
    hpcController.buscarNode(req, res);
})

router.post("/cadastrarNode", function (req, res) {
    hpcController.cadastrarNode(req, res);
})

router.post("/editarNode", function (req, res) {
    hpcController.editarNode(req, res);
})
router.post("/deletarNode", function (req, res) {
    hpcController.deletarNode(req, res);
});


module.exports = router;