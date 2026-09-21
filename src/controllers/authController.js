const authModel = require("../models/authModel");

async function buscarUsuario(req, res) {
    const { email } = req.body;

    const result = await authModel.buscarUsuario(email);

    return res.status(200).json(result[0]);
}

module.exports = {
    buscarUsuario
}