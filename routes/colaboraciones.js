const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/colaboracionController");


router.post("/", ctrl.crearColaboracion);
router.get('/por-agente/:email', ctrl.obtenerPorAgente);
router.get("/", ctrl.obtenerPorAgente);
router.patch("/:id", ctrl.actualizarEstado);



module.exports = router;
