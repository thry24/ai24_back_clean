const express = require('express');
const router = express.Router();

const recorridoCtrl = require('../controllers/recorridoController');
const { verifyToken } = require('../middlewares/authMiddleware');

// ======================
// NUEVOS ENDPOINTS
// ======================

// 1) Solicitar recorridos (crea recorridos en PENDIENTE + notifica)
router.post('/solicitar', verifyToken, recorridoCtrl.solicitarRecorridos);

// 2) Confirmar disponibilidad (solo dueño de la propiedad)
router.patch('/:recorridoId/confirmar', verifyToken, recorridoCtrl.confirmarRecorrido);

// 3) Elegir recorrido (define propiedad final del seguimiento)
router.patch('/:recorridoId/elegir', verifyToken, recorridoCtrl.elegirRecorrido);
router.get(
  '/por-seguimiento/:seguimientoId',
  verifyToken,
  recorridoCtrl.obtenerPorSeguimiento
);

// ======================
// ENDPOINTS EXISTENTES
// ======================

// Crear nuevo recorrido (tu flujo manual actual)
router.post('/', verifyToken, recorridoCtrl.crear);

// Obtener recorridos por agente
router.get('/por-agente/:email', verifyToken, recorridoCtrl.obtenerPorAgente);

// Actualizar recorrido
router.put('/:id', verifyToken, recorridoCtrl.actualizar);

// Eliminar recorrido
router.delete('/:id', verifyToken, recorridoCtrl.eliminar);

module.exports = router;
