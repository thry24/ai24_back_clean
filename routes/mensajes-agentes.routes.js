const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const mensajesCtrl = require('../controllers/mensajesAgentes.controller');

// 📩 Crear mensaje (CONTACTAR)
router.post('/', verificarToken, mensajesCtrl.crearMensaje);

// 📩 Obtener mensajes (inbox)
router.get('/', verificarToken, mensajesCtrl.obtenerMensajes);

// 👥 Obtener contactos
router.get('/contactos', verificarToken, mensajesCtrl.obtenerContactos);

// 🔍 Buscar agente por nombre
router.get('/agentes/buscar', verificarToken, mensajesCtrl.buscarAgentePorNombre);

module.exports = router;
