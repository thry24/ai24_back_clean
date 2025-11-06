const express = require("express");
const router = express.Router();
const { tokenOpcional } = require("../middlewares/authMiddleware");
const controller = require("../controllers/comparar.controller");

router.post("/comparar", tokenOpcional, controller.agregarAComparacion);
router.delete(
  "/comparar/:propiedadId",
  tokenOpcional,
  controller.eliminarDeComparacion
);
router.get("/comparar", tokenOpcional, controller.obtenerComparaciones);

module.exports = router;
