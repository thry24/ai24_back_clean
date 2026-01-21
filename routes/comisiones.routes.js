const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/comisiones.controller");

router.get("/inmobiliaria", verifyToken, ctrl.comisionesInmobiliaria);
router.post('/', verifyToken, ctrl.generarComision);
router.patch('/:id/pagar', verifyToken, ctrl.confirmarPagoComision);

module.exports = router;
