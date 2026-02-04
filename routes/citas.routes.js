const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const { crearCita, compartirUbicacion, crearCitaDesdeRecorrido, getHorasDisponibles, listarCitasPorAgente, obtenerCitasPorAgente, obtenerCitasInmobiliaria, crearCitaNotaria, confirmarCita, crearCitaConValidacion, crearCitaFirma} = require('../controllers/citasController');

router.get('/horas', verifyToken, getHorasDisponibles);
router.post('/',     verifyToken, crearCita);
router.post('/', verifyToken, crearCitaConValidacion);
router.post('/desde-recorrido', verifyToken, crearCitaDesdeRecorrido);
router.patch('/:id/confirmar', verifyToken, confirmarCita);

router.get('/inmobiliaria/:id', verifyToken, obtenerCitasInmobiliaria);
router.get("/:agenteEmail", verifyToken, obtenerCitasPorAgente);
router.get('/',      verifyToken, listarCitasPorAgente);
// 📍 Compartir ubicación de cita
router.post('/:id/compartir-ubicacion', verifyToken, compartirUbicacion);
// routes/citas.routes.js
router.post('/firma', verifyToken, crearCitaFirma);
// routes/citas.routes.js
router.post('/notaria', verifyToken, crearCitaNotaria);



module.exports = router;
