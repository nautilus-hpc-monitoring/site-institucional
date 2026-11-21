const router = require('express').Router();
const controller = require('../controllers/dashCategoricaController');

router.get('/buscarNodes/:id_usuario', controller.buscarNodes);
router.get('/buscarFiltros/:id_usuario', controller.buscarFiltros);
router.get('/buscarPorCluster/:id_cluster', controller.buscarPorCluster);
router.get('/buscarPorHpc/:id_hpc', controller.buscarPorHpc);

module.exports = router;
