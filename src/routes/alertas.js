const router = require('express').Router();
const alertaController = require('../controllers/alertaController');

// Mesmo cookie de sessão criado pelo login do projeto.
router.get('/', alertaController.listar);
router.patch('/:id/atendimento', alertaController.alterarAtendimento);
module.exports = router;
