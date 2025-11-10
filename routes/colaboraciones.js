const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/colaboracionController");


router.post("/", ctrl.crearColaboracion);
router.get('/por-agente/:email', ctrl.obtenerPorAgente);
router.get("/", ctrl.obtenerPorAgente);
router.patch("/:id", ctrl.actualizarEstado);
router.put('/:id/responder', verifyToken, ctrl.responderColaboracion);



module.exports = router;
