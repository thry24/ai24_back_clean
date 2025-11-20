const express = require('express');
const router = express.Router();

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

module.exports = router;
