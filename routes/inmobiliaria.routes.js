const express = require("express");
const router = express.Router();
const Inmobiliaria = require("../models/Inmobiliaria");

// 👉 OBTENER PERFIL
router.get("/:id/perfil", async (req, res) => {
  try {
    const inmo = await Inmobiliaria.findById(req.params.id);
    if (!inmo) return res.status(404).json({ error: "No encontrada" });

    res.json(inmo);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 👉 ACTUALIZAR PERFIL
router.put("/:id/perfil", async (req, res) => {
  try {
    const inmo = await Inmobiliaria.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(inmo);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 👇 lo que ya tenías
router.get("/propiedades/:idInmobiliaria", require("../controllers/inmobiliaria.controller").getPropiedadesPorInmobiliaria);

// ✅ LISTAR TODAS (DIRECTORIO)
router.get("/", async (req, res) => {
  try {
    const inmobiliarias = await Inmobiliaria.find()
      .select("nombre logo descripcion colorPrimario heroTitulo")
      .sort({ _id: -1 });

    res.json(inmobiliarias);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
