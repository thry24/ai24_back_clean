const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/seguimiento.controller");
const { verifyToken, permitirRoles } = require("../middlewares/authMiddleware");

/**
 * ================================
 *  CREAR / OBTENER (NO USAR EN CONTACTO)
 * ================================
 */
router.post("/", ctrl.createOrGetSeguimiento);

/**
 * ================================
 *  OBTENER POR AGENTE (EMAIL)
 *  ⚠️ ESTA DEBE IR ANTES QUE "/"
 *  GET /api/seguimientos/agente/:agenteEmail
 * ================================
 */
router.get(
  "/agente/:agenteEmail",
  verifyToken,
  ctrl.getByAgente
);

/**
 * ================================
 *  OBTENER POR CLIENTE + AGENTE (QUERY)
 *  GET /api/seguimientos?clienteEmail=...&agenteEmail=...
 * ================================
 */
router.get(
  "/",
  verifyToken,
  ctrl.getByClienteAgente
);

/**
 * ================================
 *  OBTENER POR ID DE AGENTE (LEGACY)
 *  ⚠️ NO USAR PARA TU VISTA ACTUAL
 * ================================
 */
router.get(
  "/agente-id/:agenteId",
  verifyToken,
  ctrl.getSeguimientosPorAgente
);

/**
 * ================================
 *  ACTUALIZAR SEGUIMIENTO
 * ================================
 */
router.patch(
  "/:id",
  verifyToken,
  ctrl.patchSeguimiento
);

/**
 * ================================
 *  SEGUIMIENTOS POR INMOBILIARIA
 * ================================
 */
router.get(
  "/inmobiliaria/dashboard/:id",
  verifyToken,
  permitirRoles("inmobiliaria"),
  ctrl.getSeguimientosDashboardInmobiliaria
);

router.get(
  "/inmobiliaria/:inmobiliariaId",
  verifyToken,
  permitirRoles("inmobiliaria"),
  ctrl.obtenerSeguimientosDeInmobiliaria
);

// Alias CRM (opcional)
router.get(
  "/crm/inmobiliaria/:inmobiliariaId",
  verifyToken,
  permitirRoles("inmobiliaria"),
  ctrl.obtenerSeguimientosDeInmobiliaria
);

// Legacy CRM (si aún se usa)
router.get(
  "/crm/seguimientos/inmobiliaria/:inmobiliariaId",
  verifyToken,
  ctrl.getByInmobiliaria
);

module.exports = router;
