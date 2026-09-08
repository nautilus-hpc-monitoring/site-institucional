var express = require("express");

var router = express.Router();

var cduserController = require("../controllers/cduserController");

router.post("/cadastrarFuncionario", function (req,res) {
    cduserController.cadastrarFuncionario(req,res);
});


module.exports = router;
