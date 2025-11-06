const express = require('express');
const router = express.Router();
const Requerimiento = require('../models/Requerimiento');
const { verificarToken } = require('../middlewares/auth');

// Crear nuevo requerimiento
router.post('/', verificarToken, async (req, res) => {
  try {
    const data = req.body;

    data.agenteId = req.user.id;

    const nuevoReq = new Requerimiento(data);
    await nuevoReq.save();

    res.status(201).json({ mensaje: 'Requerimiento creado correctamente', nuevoReq });
  } catch (error) {
    console.error('Error al crear requerimiento:', error);
    res.status(500).json({ mensaje: 'Error al crear requerimiento' });
  }
});


// Obtener todos los requerimientos
router.get('/', verificarToken, async (req, res) => {
  try {
    const requerimientos = await Requerimiento.find().sort({ creadoEn: -1 });
    res.json(requerimientos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener requerimientos' });
  }
});

module.exports = router;
