const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

router.post("/usuario", function (req, res) {
    authController.buscarUsuario(req, res);
});

module.exports = router;