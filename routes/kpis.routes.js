const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const kpisController = require("../controllers/kpis.controller");

router.get("/zona-mas-buscada", verifyToken, kpisController.kpiZonaMasBuscada);

// ✅ Asegúrate que esta ruta esté protegida y bien registrada
router.get("/inmobiliaria", verifyToken, kpisController.kpisInmobiliaria);

module.exports = router;
