const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/seguimiento.controller");

router.post("/", ctrl.createOrGetSeguimiento);
router.get("/", ctrl.getByClienteAgente);
router.get("/agente/:agenteEmail", ctrl.getByAgente);
router.patch("/:id", ctrl.patchSeguimiento);

module.exports = router;
