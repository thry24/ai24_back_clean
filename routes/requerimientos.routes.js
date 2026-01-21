const express = require('express');
const router = express.Router();
const Requerimiento = require('../models/Requerimiento');
const User = require('../models/User'); // 🔴 IMPORTANTE
const { verificarToken } = require('../middlewares/auth');
const { enviarNuevoRequerimientoInmo } = require('../utils/requerimiento-inm');

/* ======================================================
   CREAR REQUERIMIENTO
====================================================== */
router.post('/', verificarToken, async (req, res) => {
  try {
    console.log('==============================');
    console.log('📝 POST /requerimientos');
    console.log('👤 Usuario autenticado:', req.user);

    let inmobiliariaId;

    if (req.user.rol === 'inmobiliaria') {
      inmobiliariaId = req.user.id;
    }

    if (req.user.rol === 'agente') {
      inmobiliariaId = req.user.inmobiliaria;
    }

    if (!inmobiliariaId) {
      console.log('❌ Usuario sin inmobiliaria válida');
      return res.status(400).json({ msg: 'Inmobiliaria no válida' });
    }

    const nuevoReq = new Requerimiento({
      ...req.body,
      creadoPor: req.user.id,
      rolCreador: req.user.rol,
      inmobiliaria: inmobiliariaId
    });

    console.log('🧩 Requerimiento a guardar:', nuevoReq);

    await nuevoReq.save();

    console.log('✅ Requerimiento guardado:', nuevoReq._id);

    /* ======================================
       SI CREA LA INMOBILIARIA → AVISAR AGENTES
    ====================================== */
    if (req.user.rol === 'inmobiliaria') {
      console.log('🏢 Buscando agentes de la inmobiliaria...');

      const agentes = await User.find({
        inmobiliaria: req.user.id,
        rol: 'agente'
      }).select('correo nombre');

      console.log('👥 Agentes encontrados:', agentes.length);
      console.log('🧪 typeof enviarNuevoRequerimientoInmo:', typeof enviarNuevoRequerimientoInmo);
      console.log('🏢 Inmobiliaria ID:', req.user.id);
      console.log('👥 Correos agentes:', agentes.map(a => a.correo));
      
      await Promise.all(
        agentes.map(async (agente) => {
          try {
            console.log('✉️ Enviando correo a:', agente.correo);
            console.log('🧪 typeof enviarNuevoRequerimientoInmo:', typeof enviarNuevoRequerimientoInmo);

            await enviarNuevoRequerimientoInmo({
              to: agente.correo,
              nombreAgente: agente.nombre,
              nombreInmobiliaria: req.user.nombre
            });

            console.log('✅ Correo enviado a:', agente.correo);
          } catch (err) {
            console.error('❌ Error enviando correo:', err);
          }
        })
      );
    }

    console.log('==============================');

    res.status(201).json({
      mensaje: 'Requerimiento creado correctamente',
      nuevoReq
    });

  } catch (error) {
    console.error('🔥 ERROR POST /requerimientos:', error);
    res.status(500).json({ mensaje: 'Error al crear requerimiento' });
  }
});



/* ======================================================
   OBTENER REQUERIMIENTOS
====================================================== */
router.get('/', verificarToken, async (req, res) => {
  try {
    console.log('📥 GET /requerimientos');

const requerimientos = await Requerimiento.find({
  inmobiliaria:
    req.user.rol === 'inmobiliaria'
      ? req.user.id
      : req.user.inmobiliaria
})
.populate('creadoPor', 'nombre correo fotoPerfil rol')
.sort({ creadoEn: -1 })
.lean();
    console.log('📊 Total requerimientos:', requerimientos.length);

 const resultado = requerimientos.map(r => ({
  _id: r._id,

  tipoOperacion: r.tipoOperacion,
  tipoPropiedad: r.tipoPropiedad,
  ciudad: r.ciudad || "",
  zonas: r.zonas || [],
  caracteristicas: r.caracteristicas,
  presupuesto: r.presupuesto,
  formaPago: r.formaPago,
  fechaOperacion: r.fechaOperacion,
  creadoEn: r.creadoEn,

  // 🔑 🔑 🔑 ESTO ES LO QUE FALTABA
  rolCreador: r.rolCreador,
  inmobiliaria: r.inmobiliaria,

  // compatibilidad vieja
  agenteId: r.agenteId?._id || null,
  agenteInmobiliaria: r.agenteId?.inmobiliaria || null,

  nombreAgente:
    r.agenteId?.nombre ||
    r.agenteId?.nombreCompleto ||
    r.nombreAgente ||
    'Sin nombre',
}));

    res.json(resultado);

  } catch (error) {
    console.error('🔥 ERROR GET /requerimientos:', error);
    res.status(500).json({ mensaje: 'Error al obtener requerimientos' });
  }
});

/* ======================================================
   AGENTES DE UNA INMOBILIARIA
====================================================== */
router.get('/agentes/inmobiliaria/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🏢 GET agentes de inmobiliaria:', id);

    const agentes = await User.find({
      inmobiliaria: id,
      rol: 'agente'
    }).select('_id nombre correo fotoPerfil');

    console.log(
      '👥 Agentes encontrados:',
      agentes.map(a => a.correo)
    );

    res.json(agentes);

  } catch (err) {
    console.error('🔥 Error obteniendo agentes:', err);
    res.status(500).json({ msg: 'Error obteniendo agentes de la inmobiliaria' });
  }
});

module.exports = router;
