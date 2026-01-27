const express = require("express");
const router = express.Router();
const Inmobiliaria = require("../models/Inmobiliaria");
const User = require("../models/User"); // <-- si tu modelo se llama Usuario, cambia aquí

// 👉 OBTENER PERFIL (rellena logo desde users si falta)
router.get("/:id/perfil", async (req, res) => {
  try {
    const inmo = await Inmobiliaria.findById(req.params.id).lean();
    if (!inmo) return res.status(404).json({ error: "No encontrada" });

    // Si no tiene logo en inmobiliarias, trae el del user dueño
    if (!inmo.logo) {
      const user = await User.findOne(
        { inmobiliaria: req.params.id },
        { logo: 1 }
      ).lean();

      if (user?.logo) inmo.logo = user.logo;
    }

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

    if (!inmo) return res.status(404).json({ error: "No encontrada" });

    // ✅ Si actualizaron logo en inmobiliaria, sincroniza también el logo del user dueño
    if (req.body?.logo) {
      await User.updateOne(
        { inmobiliaria: req.params.id }, // (si quieres más estricto: { inmobiliaria: req.params.id, rol: 'inmobiliaria' })
        { $set: { logo: req.body.logo } }
      );
    }

    res.json(inmo);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// 👇 lo que ya tenías
router.get(
  "/propiedades/:idInmobiliaria",
  require("../controllers/inmobiliaria.controller").getPropiedadesPorInmobiliaria
);

// ✅ LISTAR TODAS (DIRECTORIO) con lookup a users
router.get("/", async (req, res) => {
  try {
    const inmobiliarias = await Inmobiliaria.aggregate([
      { $sort: { _id: -1 } },
      {
        $lookup: {
          from: "users", // <-- si tu colección se llama "usuarios", cámbialo a "usuarios"
          localField: "_id",
          foreignField: "inmobiliaria", // <-- campo en User que apunta a la inmobiliaria
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          logo: { $ifNull: ["$logo", "$user.logo"] },
        },
      },
      {
        $project: {
          nombre: 1,
          logo: 1,
          descripcion: 1,
          colorPrimario: 1,
          heroTitulo: 1,
        },
      },
    ]);

    res.json(inmobiliarias);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
