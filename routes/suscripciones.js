const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Inmobiliaria = require('../models/Inmobiliaria');

/* ============================================================
   1️⃣ Verificar acceso CRM POR ID DE USUARIO  (FUNCIONA PARA TODOS)
   ============================================================ */
router.get('/verificar/:idUsuario', async (req, res) => {
  try {
    const usuario = await User.findById(req.params.idUsuario)
      .populate('inmobiliaria');

    if (!usuario) {
      return res.json({ acceso: false, msg: "Usuario no encontrado" });
    }

    // ⚡ Para todos aplicamos esta lógica general:
    const hoy = new Date();
    let acceso = false;

    /* ============================================================
       🏢 1. SI ES INMOBILIARIA
       ============================================================ */
    if (usuario.rol === "inmobiliaria") {
      const inmo = await Inmobiliaria.findOne({ correo: usuario.correo });

      if (inmo && inmo.planActivo && (!inmo.planExpira || new Date(inmo.planExpira) > hoy)) {
        acceso = true;
      }

      return res.json({ acceso });
    }

    /* ============================================================
       👤 2. AGENTE INDEPENDIENTE (sin inmobiliaria)
       ============================================================ */
    if (usuario.rol === "agente" && !usuario.inmobiliaria) {
      if (usuario.planActivo && (!usuario.planExpira || new Date(usuario.planExpira) > hoy)) {
        acceso = true;
      }
      return res.json({ acceso });
    }

    /* ============================================================
       🧑‍💼 3. AGENTE DE INMOBILIARIA
       ============================================================ */
    if (usuario.rol === "agente" && usuario.inmobiliaria) {
      const inmo = usuario.inmobiliaria;

      if (inmo.planActivo && (!inmo.planExpira || new Date(inmo.planExpira) > hoy)) {
        acceso = true;
      }
      return res.json({ acceso });
    }

    return res.json({ acceso: false });

  } catch (err) {
    console.error('Error al verificar plan:', err);
    return res.json({ acceso: false, msg: "Error al verificar" });
  }
});
// ====================================================
// 2️⃣ Activar plan (para pruebas)
// ====================================================
router.post('/activar/:idUsuario', async (req, res) => {
  try {
    const { tipoPlan, dias } = req.body;
    const expira = new Date();
    expira.setDate(expira.getDate() + dias);

    const user = await User.findById(req.params.idUsuario);

    if (!user) {
      return res.status(404).json({ success: false, msg: 'Usuario no encontrado' });
    }

    // ➤ Si es inmobiliaria → activar su registro en Inmobiliaria
    if (user.rol === 'inmobiliaria') {
      await Inmobiliaria.findOneAndUpdate(
        { correo: user.correo },
        { tipoPlan, planActivo: true, planExpira: expira }
      );
    }

    // ➤ Si es agente independiente → activar su plan
    if (user.rol === 'agente' && !user.inmobiliaria) {
      user.tipoPlan = tipoPlan;
      user.planActivo = true;
      user.planExpira = expira;
      await user.save();
    }

    return res.json({
      success: true,
      msg: 'Plan activado correctamente',
      expira
    });

  } catch (error) {
    console.error('Error activando plan:', error);
    return res.status(500).json({
      success: false,
      msg: 'Error al activar plan'
    });
  }
});

module.exports = router;
