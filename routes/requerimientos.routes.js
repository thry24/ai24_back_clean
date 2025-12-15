const express = require('express');
const router = express.Router();
const Requerimiento = require('../models/Requerimiento');
const { verificarToken } = require('../middlewares/auth');

router.post('/', verificarToken, async (req, res) => {
  try {
    const data = req.body;

    data.agenteId = req.user.id;
    data.agenteInmobiliaria = req.user.inmobiliaria;   // <<--- AQUI SE ARREGLA TODO

    const nuevoReq = new Requerimiento(data);
    await nuevoReq.save();

    res.status(201).json({ mensaje: 'Requerimiento creado correctamente', nuevoReq });
  } catch (error) {
    console.error('Error al crear requerimiento:', error);
    res.status(500).json({ mensaje: 'Error al crear requerimiento' });
  }
});

router.get('/', verificarToken, async (req, res) => {
  try {
    const requerimientos = await Requerimiento.find()
      .populate("agenteId", "nombre username nombreCompleto fotoPerfil correo email inmobiliaria")
      .sort({ creadoEn: -1 })
      .lean();

    const resultado = requerimientos.map(r => ({
      _id: r._id,
      tipoOperacion: r.tipoOperacion,
      tipoPropiedad: r.tipoPropiedad,
      caracteristicas: r.caracteristicas,
      presupuesto: r.presupuesto,
      formaPago: r.formaPago,
      tipoGarantia: r.tipoGarantia,
      fechaOperacion: r.fechaOperacion,
      creadoEn: r.creadoEn,
      ciudad: r.ciudad || "",
      zonas: r.zonas || [],

      // 🔥 AGENTE POPULADO CORRECTAMENTE
      agenteId: r.agenteId?._id || null,

      nombreAgente:
        r.agenteId?.nombre ||
        r.agenteId?.nombreCompleto ||
        r.agenteId?.username ||
        r.nombreAgente ||            // fallback si estaba guardado así
        "Sin nombre",

      fotoAgente: r.agenteId?.fotoPerfil || "",
      correoAgente: r.agenteId?.correo || r.agenteId?.email || "",
      agenteInmobiliaria: r.agenteId?.inmobiliaria || null
    }));

    res.json(resultado);

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener requerimientos' });
  }
});

const User = require('../models/User');

router.get('/agentes/inmobiliaria/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;

    const agentes = await User.find({
      inmobiliaria: id,
      rol: 'agente'
    }).select('_id nombre correo fotoPerfil');

    res.json(agentes);

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error obteniendo agentes de la inmobiliaria' });
  }
});

module.exports = router;
