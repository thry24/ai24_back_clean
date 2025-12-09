const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const busquedasCtrl = require("../controllers/busquedas.controller");

router.post("/registrar", verifyToken, busquedasCtrl.registrarBusqueda);

module.exports = router;
