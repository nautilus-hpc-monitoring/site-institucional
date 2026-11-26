const router = require('express').Router();
const controller = require('../controllers/dashBillingController');

// Resumo mensal consumido pela dashboard de billing.
router.get('/resumo', controller.resumo);
router.get('/meses', controller.meses);

module.exports = router;
