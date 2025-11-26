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
};
