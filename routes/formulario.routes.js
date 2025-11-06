const express = require("express");
const router = express.Router();
const controller = require("../controllers/formulario.controller");
const { verifyToken, permitirRoles } = require("../middlewares/authMiddleware");

router.post("/formulario", controller.enviarFormulario);
router.get(
  "/formularios",
  verifyToken,
  permitirRoles("agente", "inmobiliaria"),
  controller.getFormularios
);
router.get(
  "/formularios/exportar",
  verifyToken,
  permitirRoles("agente", "inmobiliaria"),
  controller.exportarFormularios
);
router.put(
  "/formularios/:id/estado",
  verifyToken,
  permitirRoles("agente", "inmobiliaria"),
  controller.actualizarEstado
);

module.exports = router;
