const express = require("express");
const router = express.Router();
const { getPropiedadesPorInmobiliaria } = require("../controllers/inmobiliaria.controller");

router.get("/propiedades/:idInmobiliaria", getPropiedadesPorInmobiliaria);

module.exports = router;
