const router = require('express').Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/crmDashboardController');
const { getDashboardInmobiliaria } = require('../controllers/crmDashboardController');

function attachUserId(req, res, next) {
  const u = req.user || {};
  const id = u.id || u.userId || u._id || u.uid;
  if (!id) {
    return res.status(401).json({ msg: 'Token válido pero sin id de usuario' });
  }
  req.user = { ...u, id };
  next();
}


router.get('/crm/dashboard', verifyToken, ctrl.getDashboard);

router.get(
  '/crm/dashboard/inmobiliaria/:id',
  verifyToken,
  ctrl.getDashboardInmobiliaria
);

router.get("/crm/agentes/:agenteId/seguimientos", verifyToken, ctrl.getSeguimientosAgente);

// 🔹 Objetivos
router.get('/crm/objetivos', verifyToken, ctrl.getObjetivos);
router.put('/crm/objetivos', verifyToken, ctrl.upsertObjetivo);

module.exports = router;
