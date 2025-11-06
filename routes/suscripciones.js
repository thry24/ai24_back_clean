const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/verificar/:idUsuario', async (req, res) => {
  try {
    const usuario = await User.findById(req.params.idUsuario).populate('inmobiliaria');

    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    let acceso = false;

    // Caso 1: el usuario tiene plan activo
    if (usuario.planActivo && (!usuario.planExpira || new Date(usuario.planExpira) > new Date())) {
      acceso = true;
    }

    // Caso 2: si pertenece a una inmobiliaria con plan activo
    if (!acceso && usuario.inmobiliaria) {
      const inmobiliaria = usuario.inmobiliaria;
      if (
        inmobiliaria.planActivo &&
        (!inmobiliaria.planExpira || new Date(inmobiliaria.planExpira) > new Date())
      ) {
        acceso = true;
      }
    }

    res.json({ success: true, acceso });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al verificar plan' });
  }
});

router.post('/activar/:id', async (req, res) => {
  const { tipoPlan, dias } = req.body; // ejemplo: tipoPlan="mensual", dias=30
  const expiracion = new Date();
  expiracion.setDate(expiracion.getDate() + dias);

  await User.findByIdAndUpdate(req.params.id, {
    planActivo: true,
    tipoPlan,
    planExpira: expiracion,
  });

  res.json({ success: true, message: 'Plan activado correctamente' });
});

module.exports = router;
