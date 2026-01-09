const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/colaboracionController");

router.post("/", verifyToken, ctrl.crearColaboracion);
router.get("/por-agente/:email", verifyToken, ctrl.obtenerPorAgente);
router.get("/", verifyToken, ctrl.obtenerPorAgente);
router.patch("/:id", verifyToken, ctrl.actualizarEstado);
router.put('/:id/responder', verifyToken, ctrl.responderColaboracion);
router.get("/por-inmobiliaria/:id", verifyToken, ctrl.obtenerPorInmobiliaria);

module.exports = router;
