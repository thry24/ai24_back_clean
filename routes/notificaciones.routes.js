const router = require('express').Router();
const ctrl = require('../controllers/notificaciones.controller');

router.get('/:email', ctrl.obtenerNotificaciones);
router.put('/leer/:id', ctrl.marcarLeida);

module.exports = router;
