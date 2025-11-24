const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/productividad.controller");

router.get("/inmobiliaria", verifyToken, ctrl.productividadInmobiliaria);

module.exports = router;
