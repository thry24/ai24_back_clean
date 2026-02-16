const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");
const { generarPassword } = require("../utils/password");
const { enviarRecuperacionPassword } = require("../utils/mailer");
const upload = require("../middlewares/upload.middleware");
const uploadLogo = require("../middlewares/uploadLogo.middleware");
const { verifyToken } = require("../middlewares/authMiddleware");
const User = require("../models/User");

console.log("completeGoogleProfile:", typeof authController.completeGoogleProfile);

router.get("/users", verifyToken, authController.listUsers);
router.get("/me", verifyToken, authController.getUsuarioActual);
router.get("/inmobiliaria", authController.obtenerInmobiliaria);

router.get("/agentes/:id/disponibilidad", authController.obtenerHorasDisponibles);
router.put("/agentes/:id/disponibilidad", authController.actualizarDisponibilidad);

router.post("/initregister", upload, authController.initRegister);
router.post("/verify", authController.verifyCode);
router.post("/register", authController.register);
router.post("/login", authController.login);

router.get("/agentes", authController.obtenerAgentes);

router.put("/tipo-cliente", verifyToken, authController.actualizarTipoCliente);

router.put("/actualizar-foto", verifyToken, upload, authController.actualizarFotoPerfil);
router.put("/actualizar-logo", verifyToken, uploadLogo, authController.actualizarLogo);

router.post("/google", authController.googleSignIn);
router.put("/google/complete-profile", verifyToken, authController.completeGoogleProfile);

router.post("/recuperar-password", async (req, res) => {
  try {
    const { correo } = req.body;

    const user = await User.findOne({ correo: correo.toLowerCase().trim() });
    if (!user) return res.json({ ok: true });

    const nuevaPassword = generarPassword();
    user.password = nuevaPassword;
    await user.save();

    await enviarRecuperacionPassword({
      to: correo,
      nombre: user.nombre,
      password: nuevaPassword,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Error recuperar password:", err);
    res.status(500).json({ msg: "Error al recuperar contraseña" });
  }
});

module.exports = router;
