const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

router.post("/", function (req, res) {
    authController.autenticar(req, res);
});

module.exports = router;