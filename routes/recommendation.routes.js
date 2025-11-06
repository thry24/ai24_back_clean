const router = require('express').Router();
const ctrl = require('../controllers/recommendation.controller');
const { verifyToken, permitirRoles } = require('../middlewares/authMiddleware');

router.post(
  '/',
  verifyToken,
  permitirRoles("agente", "inmobiliaria",),
  ctrl.enviarRecomendacion
);

router.get(
  '/',
  verifyToken,
  permitirRoles('cliente'),
  ctrl.obtenerRecomendaciones
);

router.post(
  '/:recomendacionId/aceptar',
  verifyToken,
  permitirRoles('cliente'),
  ctrl.aceptarRecomendacion
);

router.post(
  '/:recomendacionId/rechazar',
  verifyToken,
  permitirRoles('cliente'),
  ctrl.rechazarRecomendacion
);

module.exports = router;
