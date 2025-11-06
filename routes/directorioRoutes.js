const express = require('express');
const router = express.Router();
const { verifyToken: auth } = require('../middlewares/authMiddleware');
const Mensaje = require('../models/Mensaje');
const Relacion = require('../models/RelacionAgenteCliente');

// 🟢 Obtener todos los mensajes donde participe el agente
router.get('/mensajes/agente/:email', auth, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();

    const mensajes = await Mensaje.find({
      $or: [
        { emisorEmail: email },
        { receptorEmail: email }
      ]
    }).sort({ fecha: -1 });

    res.json(mensajes);
  } catch (error) {
    console.error('❌ Error al obtener mensajes del agente:', error);
    res.status(500).json({ msg: 'Error al obtener mensajes' });
  }
});

// 🟣 Obtener relaciones (clientes ligados al agente)
router.get('/relaciones/agente/:id', auth, async (req, res) => {
  try {
    const agenteId = req.params.id;

    const relaciones = await Relacion.find({ agente: agenteId })
      .populate('cliente', 'nombre correo email telefono createdAt')
      .sort({ updatedAt: -1 });

    res.json(relaciones);
  } catch (error) {
    console.error('❌ Error al obtener relaciones del agente:', error);
    res.status(500).json({ msg: 'Error al obtener relaciones' });
  }
});

module.exports = router;
