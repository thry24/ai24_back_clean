const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const { crearCita, getHorasDisponibles, listarCitasPorAgente, obtenerCitasPorAgente, obtenerCitasInmobiliaria } = require('../controllers/citasController');

router.get('/horas', verifyToken, getHorasDisponibles);
router.post('/',     verifyToken, crearCita);
router.get('/inmobiliaria/:id', verifyToken, obtenerCitasInmobiliaria);
router.get("/:agenteEmail", verifyToken, obtenerCitasPorAgente);
router.get('/',      verifyToken, listarCitasPorAgente);



module.exports = router;
