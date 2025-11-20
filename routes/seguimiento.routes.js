const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/seguimiento.controller");
const { verifyToken } = require("../middlewares/authMiddleware");

// crear o devolver
router.post("/", ctrl.createOrGetSeguimiento);

// obtener por cliente/agente
router.get("/", ctrl.getByClienteAgente);

// obtener por email de agente
router.get("/agente/:agenteEmail", ctrl.getByAgente);

// obtener por ID de agente (nuevo)
router.get("/agente-id/:agenteId", verifyToken, ctrl.getSeguimientosPorAgente);

router.patch("/:id", ctrl.patchSeguimiento);


// Seguimientos por inmobiliaria
router.get("/crm/seguimientos/inmobiliaria/:inmobiliariaId", verifyToken, ctrl.getByInmobiliaria);
module.exports = router;
