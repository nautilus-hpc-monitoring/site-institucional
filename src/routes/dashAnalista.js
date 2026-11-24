const router = require('express').Router();
const controller = require('../controllers/dashAnalistaController');

router.get('/clusters', controller.listar);

router.get('/clusters/:id/nodes', controller.listarNodes);
router.get('/clusters/:id/dados', controller.dados);

module.exports = router;
