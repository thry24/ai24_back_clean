const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Propiedad = require('../models/Propiedad');
const Inmobiliaria = require('../models/Inmobiliaria');
const { generarPasswordSeguro, hashPassword } = require('../utils/password');
const { enviarCredenciales } = require('../utils/mailer');
const { verifyToken } = require("../middlewares/authMiddleware");
const agentesController = require("../controllers/agentes.controller");

const router = express.Router();

/**
 * Helper: validar plan de la inmobiliaria
 */
async function validarPlan(inmobiliariaId) {
  const inmo = await Inmobiliaria.findById(inmobiliariaId);
  if (!inmo) throw new Error("Inmobiliaria no encontrada");

  const hoy = new Date();
  if (hoy > inmo.plan.fechaFin) throw new Error("El plan de esta inmobiliaria ha expirado");
  return inmo;
}
router.get("/todos", verifyToken, agentesController.obtenerAgentes);
/**
 * GET /api/agentes?inmobiliaria=<id>&q=<texto>&status=Active|Inactive
 */
router.get('/', async (req, res) => {
  try {
    const { inmobiliaria, q, status } = req.query;
    const filter = { rol: 'agente' };

    if (inmobiliaria && mongoose.isValidObjectId(inmobiliaria)) {
      filter.inmobiliaria = inmobiliaria;
    } else {
      return res.json([]); // nada si no hay inmobiliaria
    }

    if (status) filter.status = status;

    if (q && q.trim()) {
      const r = new RegExp(q.trim(), 'i');
      filter.$or = [{ nombre: r }, { correo: r }, { telefono: r }];
    }

    const agentes = await User.find(filter).lean();
    res.json(agentes);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/agentes
 * Crea agente bajo una inmobiliaria, asigna password aleatoria y la envía por correo
 */
router.post('/', async (req, res) => {
  try {
    const { nombre, correo, telefono, inmobiliaria } = req.body;

    if (!nombre || !correo || !inmobiliaria) {
      return res.status(400).json({ error: 'nombre, correo e inmobiliaria son requeridos' });
    }

    // 🔹 Buscar la inmobiliaria REAL en BD
    const inmo = await Inmobiliaria.findById(inmobiliaria);
    if (!inmo) return res.status(404).json({ error: 'Inmobiliaria no encontrada' });

    // 🔹 Revisar correo duplicado
    const existente = await User.findOne({ correo });
    if (existente) {
      return res.status(400).json({ error: 'Ese correo ya existe' });
    }

    // 🔹 Generar contraseña temporal
    const tempPass = generarPasswordSeguro();
    const hashedPass = await hashPassword(tempPass);

    // 🔹 Crear agente HEREDANDO el plan
    const nuevo = await User.create({
      nombre,
      correo,
      telefono,
      rol: 'agente',
      inmobiliaria: inmo._id,
      status: 'Active',
      password: hashedPass,

      // 🔥 HEREDAR PLAN AUTOMÁTICAMENTE 🔥
      planActivo: inmo.planActivo || false,
      planExpira: inmo.planExpira || null,
      tipoPlan: inmo.tipoPlan || 'sin-plan',
    });

    // 🔹 Enviar email con credenciales
    await enviarCredenciales(
      correo,
      inmo.nombre,
      correo,
      tempPass
    );

    res.status(201).json(nuevo);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


/**
 * PATCH /api/agentes/:id
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'id inválido' });

    const updates = (({ nombre, telefono, correo, status, fotoPerfil }) =>
      ({ nombre, telefono, correo, status, fotoPerfil }))(req.body);

    const updated = await User.findOneAndUpdate(
      { _id: id, rol: 'agente' },
      updates,
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'Agente no encontrado' });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * DELETE /api/agentes/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'id inválido' });

    await User.deleteOne({ _id: id, rol: 'agente' });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
/**
 * GET /api/agentes/list/:inmobiliariaId
 * Devuelve la lista con métricas EXACTAS para el frontend de Mis Agentes
 */
router.get('/list/:inmobiliariaId', async (req, res) => {
  try {
    const { inmobiliariaId } = req.params;

    if (!mongoose.isValidObjectId(inmobiliariaId)) {
      return res.status(400).json({ error: 'ID inmobiliaria inválido' });
    }

    // 1️⃣ Traer agentes de esa inmobiliaria
    const agentes = await User.find({
      rol: 'agente',
      inmobiliaria: inmobiliariaId
    })
      .lean()
      .select("nombre correo telefono fotoPerfil status createdAt");

    const idsAgentes = agentes.map(a => a._id);

    // 2️⃣ Contar propiedades POR AGENTE (esto estaba mal en tu versión)
    const props = await Propiedad.aggregate([
      { $match: { agente: { $in: idsAgentes } } },
      {
        $group: {
          _id: '$agente',
          total: { $sum: 1 },
          hab: {
            $sum: {
              $cond: [
                { $in: ['$tipoPropiedad', ['casa', 'departamento', 'habitacional', 'HABITACIONAL']] },
                1,
                0
              ]
            }
          },
          com: {
            $sum: {
              $cond: [
                { $in: ['$tipoPropiedad', ['bodega', 'local', 'comercial', 'COMERCIAL']] },
                1,
                0
              ]
            }
          },
          cierres: {
            $sum: {
              $cond: [
                { $in: ['$estadoPropiedad', ['CERRADO', 'VENDIDO', 'RENTADO']] },
                1,
                0
              ]
            }
          },
        }
      }
    ]);

    const propsPorAgente = Object.fromEntries(props.map(p => [String(p._id), p]));

    // 3️⃣ Formar salida final
    const resultado = agentes.map(a => {
      const m = propsPorAgente[String(a._id)] || { total: 0, hab: 0, com: 0, cierres: 0 };

      return {
        id: a._id,
        avatar: a.fotoPerfil ||
          `https://i.pravatar.cc/48?u=${encodeURIComponent(a.correo || a.nombre)}`,
        nombre: a.nombre,
        telefono: a.telefono || '',
        correo: a.correo,
        propsTotal: m.total,
        propsHab: m.hab,
        propsCom: m.com,
        cierres: m.cierres,
        antiguedad: humanAge(a.createdAt),
        status: a.status || 'Active'
      };
    });

    res.json(resultado);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo agentes' });
  }
});


/**
 * GET /api/agentes/metrics?inmobiliaria=<id>
 */
router.get('/metrics', async (req, res) => {
  try {
    const { inmobiliaria } = req.query;
    if (!inmobiliaria || !mongoose.isValidObjectId(inmobiliaria)) {
      return res.status(400).json({ error: 'inmobiliaria requerida' });
    }

    const agentes = await User.find({ rol: 'agente', inmobiliaria }).lean();

    const props = await Propiedad.aggregate([
      { $match: { inmobiliaria: new mongoose.Types.ObjectId(inmobiliaria) } },
      {
        $group: {
          _id: '$agente',
          total: { $sum: 1 },
          hab: { $sum: { $cond: [{ $in: ['$tipoPropiedad', ['casa', 'departamento', 'HABITACIONAL']] }, 1, 0] } },
          com: { $sum: { $cond: [{ $in: ['$tipoPropiedad', ['bodega', 'local', 'COMERCIAL']] }, 1, 0] } },
          cierres: { $sum: { $cond: [{ $in: ['$estadoPropiedad', ['CERRADO', 'VENDIDO', 'RENTADO']] }, 1, 0] } },
        }
      }
    ]);

    const propByAgent = Object.fromEntries(props.map(p => [String(p._id), p]));

    const data = agentes.map(a => {
      const m = propByAgent[String(a._id)] || { total: 0, hab: 0, com: 0, cierres: 0 };
      const antiguedad = a.createdAt ? humanAge(a.createdAt) : '—';
      return {
        id: a._id,
        avatar: a.fotoPerfil || `https://i.pravatar.cc/48?u=${encodeURIComponent(a.correo || a.nombre)}`,
        nombre: a.nombre,
        telefono: a.telefono || '',
        correo: a.correo,
        propsTotal: m.total,
        propsHab: m.hab,
        propsCom: m.com,
        cierres: m.cierres,
        antiguedad,
        status: a.status || 'Active'
      };
    });

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Helper: calcular antigüedad
 */
function humanAge(date) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const years = Math.floor(diff / (365 * 24 * 3600 * 1000));
  if (years >= 1) return `${years} año${years > 1 ? 's' : ''}`;
  const months = Math.floor(diff / (30 * 24 * 3600 * 1000));
  if (months >= 1) return `${months} mes${months > 1 ? 'es' : ''}`;
  const days = Math.floor(diff / (24 * 3600 * 1000));
  return `${days} día${days !== 1 ? 's' : ''}`;
}


module.exports = router;


// ================================
// 🔐 CAMBIAR CONTRASEÑA DE AGENTE
// ================================
const bcrypt = require("bcryptjs");
const { verificarToken } = require("../middlewares/auth");

router.put("/change-password", verificarToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id; // viene del token

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const user = await User.findOne({ _id: userId, rol: "agente" });
    if (!user) return res.status(404).json({ error: "Agente no encontrado" });

    // 🔒 Comparar contraseña actual
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "La contraseña actual es incorrecta" });
    }

    // 🔐 Guardar nueva (tu modelo la encripta automáticamente)
    user.password = newPassword;
    await user.save();

    res.json({ mensaje: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error del servidor" });
  }
});


// =============================
// 🖼️ ACTUALIZAR FOTO DE PERFIL
// =============================
router.put("/change-photo", verificarToken, async (req, res) => {
  try {
    const { fotoPerfil } = req.body;
    const userId = req.user.id;

    if (!fotoPerfil) {
      return res.status(400).json({ error: "No se envió imagen" });
    }

    const updated = await User.findOneAndUpdate(
      { _id: userId, rol: "agente" },
      { fotoPerfil },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Agente no encontrado" });

    res.json({
      mensaje: "Foto actualizada correctamente",
      fotoPerfil: updated.fotoPerfil
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error del servidor" });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const agente = await User.findOne({ _id: id, rol: 'agente' })
      .select('nombre correo telefono fotoPerfil status inmobiliaria');

    if (!agente) {
      return res.status(404).json({ error: 'Agente no encontrado' });
    }

    res.json(agente);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo agente' });
  }
});
