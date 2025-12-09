const express = require("express");
const router = express.Router();
const { verifyToken, permitirRoles } = require("../middlewares/authMiddleware");
const propiedadController = require("../controllers/propiedad.controller");
const uploadMultiple = require("../middlewares/uploadMultiple.middleware");

router.get("/propiedades", propiedadController.obtenerPropiedades);
router.get(
  "/propiedades/verificar-coordenadas",
  propiedadController.verificarCoordenadas
);
router.get(
  "/propiedades/por-agente-email",
  propiedadController.obtenerPropiedadesPorAgenteEmail
);

router.get(
  "/propiedades/agente/mis-propiedades",
  verifyToken,
  permitirRoles("agente"),
  propiedadController.obtenerPropiedadesAgente
);
router.get(
  "/propiedades/agente/:id",
  propiedadController.obtenerPropiedadesDeAgente
);
router.get(
  "/propiedades/inmobiliaria/:id",
  propiedadController.obtenerPropiedadesDeInmobiliaria
);
router.get("/propiedades/:id", propiedadController.obtenerPropiedadPorId);
router.get(
  "/propiedades/inmobiliaria/mis-propiedades",
  verifyToken,
  permitirRoles("inmobiliaria"),
  propiedadController.obtenerPropiedadesInmobiliaria
);
router.post(
  "/propiedades",
  verifyToken,
  permitirRoles("agente"),
  uploadMultiple,
  propiedadController.agregarPropiedad
);

router.put(
  "/propiedades/:id",
  verifyToken,
  permitirRoles("agente", "inmobiliaria"),
  uploadMultiple,
  propiedadController.actualizarPropiedad
);

router.patch(
  "/propiedades/:id/visita",
  propiedadController.incrementarVisita
);

router.post(
  "/propiedades/:id/contacto",
  verifyToken,
  propiedadController.incrementarContacto
);

router.patch(
  "/propiedades/:id/publicar",
  verifyToken,
  permitirRoles("agente", "inmobiliaria"),
  propiedadController.publicarPropiedad
);

router.patch(
  "/propiedades/:id/estado",
  verifyToken,
  permitirRoles("agente", "inmobiliaria"),
  propiedadController.actualizarEstadoPropiedad
);

router.delete(
  "/propiedades/:id",
  verifyToken,
  permitirRoles("agente", "inmobiliaria"),
  propiedadController.eliminarPropiedad
);

router.post("/busquedas/registrar", 
  verifyToken, 
  propiedadController.registrarBusqueda);

module.exports = router;
