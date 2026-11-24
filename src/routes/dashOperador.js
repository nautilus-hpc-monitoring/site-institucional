const router = require('express').Router();
const controller = require('../controllers/dashOperadorController');
router.get('/campeoes', controller.campeoes);
module.exports = router;
