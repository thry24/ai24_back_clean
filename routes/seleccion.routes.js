const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');

const seleccionCtrl = require('../controllers/seleccion.controller');

// 🔥 FLUJO COMPLETO (FRONT PRINCIPAL)
router.post(
  '/seleccionar',
  verificarToken,
  seleccionCtrl.seleccionarPropiedadFlujoCompleto
);

// 🟢 SELECCIÓN SIMPLE (NO BORRAR)
router.post(
  '/agregar',
  verificarToken,
  seleccionCtrl.agregarSeleccion
);

// 📥 OBTENER SELECCIÓN POR SEGUIMIENTO
router.get(
  '/:seguimientoId',
  verificarToken,
  seleccionCtrl.obtenerSeleccion
);
router.post(
  '/confirmar',
  verificarToken,
  seleccionCtrl.confirmarEleccion
);
router.post(
  '/sugerir',
  verificarToken,
  seleccionCtrl.sugerirPropiedad
);

module.exports = router;
