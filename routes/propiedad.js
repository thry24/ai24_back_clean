const express = require('express');
const router = express.Router();
const Propiedad = require('../models/Propiedad');

// ===============================
// OBTENER PROPIEDADES POR INMOBILIARIA
// GET /propiedades/inmobiliaria/:id
// ===============================
router.get('/inmobiliaria/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const propiedades = await Propiedad.find({ inmobiliaria: id })
      .populate('agente', 'nombre avatar telefono correo')
      .sort({ fechaCreacion: -1 }); // Opcional: ordenar por más recientes

    res.json(propiedades);

  } catch (error) {
    console.error("Error al obtener propiedades:", error);
    res.status(500).json({ error: "Error al obtener propiedades" });
  }
});

module.exports = router;
