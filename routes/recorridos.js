const express = require('express');
const router = express.Router();
const recorridoCtrl = require('../controllers/recorridoController');

// Crear nuevo recorrido
router.post('/', recorridoCtrl.crear);

// Obtener recorridos por agente
router.get('/por-agente/:email', recorridoCtrl.obtenerPorAgente);

// Actualizar recorrido
router.put('/:id', recorridoCtrl.actualizar);

// Eliminar recorrido
router.delete('/:id', recorridoCtrl.eliminar);

module.exports = router;
