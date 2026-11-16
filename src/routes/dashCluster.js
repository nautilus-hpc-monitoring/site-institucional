const router = require('express').Router();
const controller = require('../controllers/dashClusterController');
router.get('/clusters',controller.listar);
router.get('/clusters/:id/dados',controller.dados);
module.exports = router;
