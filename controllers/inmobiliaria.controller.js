const Propiedad = require("../models/Propiedad");
const Inmobiliaria = require("../models/Inmobiliaria");
const User = require("../models/User"); // ajusta si tu modelo se llama Usuario

/**
 * 🔹 PROPIEDADES POR INMOBILIARIA
 */
exports.getPropiedadesPorInmobiliaria = async (req, res) => {
  try {
    const { idInmobiliaria } = req.params;

    const propiedades = await Propiedad.find({ inmobiliaria: idInmobiliaria })
      .populate("agente", "nombre email foto")
      .populate("inmobiliaria", "nombre logo email");

    return res.json({ ok: true, propiedades });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
};

/**
 * 🔹 PERFIL PÚBLICO DE INMOBILIARIA
 */
exports.getPerfilInmobiliaria = async (req, res) => {
  try {
    const { id } = req.params;

    const inmobiliaria = await Inmobiliaria.findById(id);
    if (!inmobiliaria) {
      return res.status(404).json({ error: "Inmobiliaria no encontrada" });
    }

    return res.json(inmobiliaria);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * 🔹 ACTUALIZAR PERFIL + (opcional) SINCRONIZAR LOGO EN USER
 */
exports.updatePerfilInmobiliaria = async (req, res) => {
  try {
    const { id } = req.params;

    const inmobiliaria = await Inmobiliaria.findByIdAndUpdate(id, req.body, { new: true });
    if (!inmobiliaria) {
      return res.status(404).json({ error: "Inmobiliaria no encontrada" });
    }

    // ✅ Si viene logo, sincroniza también en el usuario dueño (para el header)
    if (req.body?.logo) {
      await User.updateOne(
        { inmobiliaria: id, rol: "inmobiliaria" }, // o sin rol si no aplica
        { $set: { logo: req.body.logo } }
      );
    }

    return res.json(inmobiliaria);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
