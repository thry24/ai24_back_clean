const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const mensajesCtrl = require('../controllers/mensajesAgentes.controller');

// 🟢 Crear mensaje nuevo
router.post('/', verificarToken, mensajesCtrl.crearMensaje);

// 🟢 Obtener todos los mensajes donde participa el agente logueado
router.get('/', verificarToken, mensajesCtrl.obtenerMensajes);

// 🟢 Obtener conversaciones únicas (agentes con los que he hablado)
router.get('/mensajes-agentes', verificarToken, mensajesCtrl.obtenerMensajesAgentes);

router.get("/agentes/buscar", mensajesCtrl.buscarAgentePorNombre);
module.exports = router;
