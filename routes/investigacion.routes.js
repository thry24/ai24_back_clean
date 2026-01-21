const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const {
  iniciarInvestigacion,
  resolverInvestigacion,
  obtenerInvestigacion,
} = require('../controllers/investigacion.controller');

router.post('/', verifyToken, iniciarInvestigacion);
router.patch('/:id/resolver', verifyToken, resolverInvestigacion);
router.get('/:seguimientoId', verifyToken, obtenerInvestigacion);

module.exports = router;
