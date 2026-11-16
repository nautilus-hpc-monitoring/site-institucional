const router = require('express').Router();
const sessao = require('../services/clusterSessao');
const alertaController = require('../controllers/alertaController');

// Mesmo cookie de sessão criado pelo login do projeto.
router.use(sessao.identificar);
router.get('/', alertaController.listar);
module.exports = router;
