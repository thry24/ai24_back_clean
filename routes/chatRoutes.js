// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken: auth } = require('../middlewares/authMiddleware');
const chatCtrl = require('../controllers/chatController');
const { mensajesPorAgente } = require('../controllers/chatController');

// enviar mensaje (JSON o multipart con 'archivo')
router.post('/enviar', auth, chatCtrl.uploadOne, chatCtrl.enviarMensaje);

router.get('/threads', auth, chatCtrl.misThreads);

// obtener conversación entre dos correos
router.get('/:email1/:email2', auth, chatCtrl.obtenerConversacion);

// marcar leído
router.patch('/marcar-leido/:id', auth, chatCtrl.marcarLeido);

// crear primer mensaje desde una propiedad (click en "contactar")
router.post('/iniciar-desde-propiedad', auth, chatCtrl.iniciarDesdePropiedad);

router.get('/agente/:email', auth, mensajesPorAgente);

// crear primer mensaje desde una propiedad
router.post('/iniciar-desde-propiedad', auth, chatCtrl.iniciarDesdePropiedad);

// ✅ NUEVO: Cerrar seguimiento del lead
router.patch('/cerrar-seguimiento/:id', auth, chatCtrl.cerrarSeguimiento);

router.get('/agente/:email', auth, mensajesPorAgente);

module.exports = router;
