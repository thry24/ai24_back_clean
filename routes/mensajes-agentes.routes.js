const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const mensajesCtrl = require('../controllers/mensajesAgentes.controller');

router.post('/', verifyToken, mensajesCtrl.crearMensaje);
router.get('/', verifyToken, mensajesCtrl.obtenerMensajesAgentes);
router.get('/contactos', verifyToken, mensajesCtrl.obtenerContactos);
router.get('/agentes/buscar', verifyToken, mensajesCtrl.buscarAgentePorNombre);


module.exports = router;
