const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const relacionController = require("../controllers/relacion.controller");

router.get("/:clienteEmail", authMiddleware.verifyToken, relacionController.obtenerRelacion);
router.post("/actualizar", authMiddleware.verifyToken, relacionController.actualizarTipoCliente);

module.exports = router;
