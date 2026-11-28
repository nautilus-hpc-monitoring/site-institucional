const router = require('express').Router();
const controller = require('../controllers/dashOperadorController');
router.get('/campeoes', controller.campeoes);
router.get('/nodes/:id/dados', controller.detalhe);
module.exports = router;
