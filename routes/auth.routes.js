const express = require("express");
const bcrypt = require('bcryptjs');
const router = express.Router();
const register = require("../controllers/auth.controller");
const { generarPassword } = require('../utils/password');
const { enviarRecuperacionPassword } = require('../utils/mailer');
const upload = require("../middlewares/upload.middleware");
const { verifyToken } = require("../middlewares/authMiddleware");
const authController = require("../controllers/auth.controller");
const User = require("../models/User");

router.get("/users", verifyToken, register.listUsers);
router.get("/me", verifyToken, register.getUsuarioActual);
router.get("/inmobiliaria", register.obtenerInmobiliaria);
router.get(
  "/agentes/:id/disponibilidad",
  register.obtenerHorasDisponibles
);
router.post("/initregister", upload, register.initRegister);
router.post("/verify", register.verifyCode);
router.post("/register", register.register);
router.post("/login", register.login);
router.put("/agentes/:id/disponibilidad", register.actualizarDisponibilidad);
router.get('/agentes', register.obtenerAgentes);


router.put('/tipo-cliente', authController.actualizarTipoCliente);

router.put(
  "/actualizar-foto",
  verifyToken,
  upload,
  register.actualizarFotoPerfil
);
router.put(
  "/actualizar-logo",
  verifyToken,
  upload,
  register.actualizarLogo
);

router.post('/auth/google', register.googleSignIn);

router.post('/recuperar-password', async (req, res) => {
  try {
    const { correo } = req.body;

    const user = await User.findOne({ correo: correo.toLowerCase().trim() });

    if (!user) {
      return res.json({ ok: true });
    }

    const nuevaPassword = generarPassword();

    user.password = nuevaPassword;
    await user.save(); 

    await enviarRecuperacionPassword({
      to: correo,
      nombre: user.nombre,
      password: nuevaPassword
    });

    res.json({ ok: true });

  } catch (err) {
    console.error('Error recuperar password:', err);
    res.status(500).json({ msg: 'Error al recuperar contraseña' });
  }
});
module.exports = router;
