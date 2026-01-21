const express = require('express');
const router = express.Router();

const Inmobiliaria = require('../models/Inmobiliaria');



router.post('/', async (req, res) => {
  try {
    const { nombre, logo, ownerId, planNombre } = req.body;

    const fechaInicio = new Date();
    const fechaFin = new Date(fechaInicio);
    fechaFin.setDate(fechaFin.getDate() + 30);

    const nuevaInmo = new Inmobiliaria({
      nombre,
      logo,
      owner: ownerId,
      plan: { nombre: planNombre || "Básico", fechaInicio, fechaFin }
    });

    await nuevaInmo.save();
    res.status(201).json(nuevaInmo);

  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:id/renovar', async (req, res) => {
  try {
    const { id } = req.params;
    const inmo = await Inmobiliaria.findById(id);
    if (!inmo) return res.status(404).json({ error: "No encontrada" });

    const fechaInicio = new Date();
    const fechaFin = new Date(fechaInicio);
    fechaFin.setDate(fechaFin.getDate() + 30);

    inmo.plan = { nombre: inmo.plan.nombre, fechaInicio, fechaFin };
    await inmo.save();

    res.json({ ok: true, plan: inmo.plan });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * 🔹 Obtener perfil público de inmobiliaria
 */
router.get('/:id/perfil', async (req, res) => {
  try {
    const inmobiliaria = await Inmobiliaria.findById(req.params.id);

    if (!inmobiliaria) {
      return res.status(404).json({ error: 'Inmobiliaria no encontrada' });
    }

    res.json(inmobiliaria);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 🔹 Editar perfil (solo inmobiliaria dueña)
 */
router.put('/:id/perfil', async (req, res) => {
  try {
    const inmobiliaria = await Inmobiliaria.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(inmobiliaria);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


/**
 * 🔹 Listar todas las inmobiliarias (directorio)
 */
router.get('/', async (req, res) => {
  try {
    const inmobiliarias = await Inmobiliaria.find()
      .select('nombre logo descripcion colorPrimario heroTitulo') // lo que quieras mostrar
      .sort({ _id: -1 });

    res.json(inmobiliarias);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
