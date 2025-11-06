const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const { crearCita, getHorasDisponibles, listarCitasPorAgente, obtenerCitasPorAgente } = require('../controllers/citasController');

router.get('/horas', verifyToken, getHorasDisponibles);
router.post('/',     verifyToken, crearCita);
router.get("/:agenteEmail", verifyToken, obtenerCitasPorAgente);
router.get('/',      verifyToken, listarCitasPorAgente);



module.exports = router;
