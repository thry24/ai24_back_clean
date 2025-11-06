const express = require("express");
const router = express.Router();
const register = require("../controllers/auth.controller");
const upload = require("../middlewares/upload.middleware");
const { verifyToken } = require("../middlewares/authMiddleware");
const authController = require("../controllers/auth.controller");

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

module.exports = router;
