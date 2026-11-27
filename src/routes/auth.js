const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

router.post("/", function (req, res) {
    authController.autenticar(req, res);
});

router.post('/credenciais', (req, res) => authController.autenticar(req, res, true));
router.post('/billing-parametros', (req, res) => authController.billingParametros(req, res));

module.exports = router;
