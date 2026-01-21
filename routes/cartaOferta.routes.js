const express = require('express');
const {
  crearCartaOferta,
  aceptarCartaOferta,
  rechazarCartaOferta,
  verCartaOfertaPublica,
  firmarCartaOferta
} = require('../controllers/cartaOferta.controller');

const router = express.Router();

router.post('/', crearCartaOferta);
router.patch('/:id/aceptar', aceptarCartaOferta);
router.patch('/:id/rechazar', rechazarCartaOferta);
router.get('/public/:id', verCartaOfertaPublica);
router.patch('/public/:id/firmar', firmarCartaOferta);

module.exports = router;
