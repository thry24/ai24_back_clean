const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const relacionController = require("../controllers/relacion.controller");

// Registrar cliente desde el agente
router.post("/registrar", verifyToken, relacionController.agenteCreaCliente);

// Actualizar tipo cliente
router.post("/actualizar", verifyToken, relacionController.actualizarTipoCliente);

// Obtener relación por email
router.get("/:clienteEmail", verifyToken, relacionController.obtenerRelacion);

module.exports = router;
