var express = require("express");

var router = express.Router();

var cduserController = require("../controllers/cduserController");

router.post("/cadastrar", function (req,res) {
    cduserController.cadastrar(req,res);
});

