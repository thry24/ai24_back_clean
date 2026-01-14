const Propiedad = require("../models/Propiedad");

exports.getPropiedadesPorInmobiliaria = async (req, res) => {
  try {
    const { idInmobiliaria } = req.params;

    const propiedades = await Propiedad.find({
      inmobiliaria: idInmobiliaria
    })
    .populate("agente", "nombre email foto")
    .populate("inmobiliaria", "nombre logo email");

    res.json({ ok: true, propiedades });

  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }


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

    res.json(inmobiliaria);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * 🔹 ACTUALIZAR PERFIL 
 */
exports.updatePerfilInmobiliaria = async (req, res) => {
  try {
    const { id } = req.params;

    const inmobiliaria = await Inmobiliaria.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    res.json(inmobiliaria);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
};
