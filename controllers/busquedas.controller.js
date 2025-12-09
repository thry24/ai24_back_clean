const Busqueda = require("../models/Busqueda");

exports.registrarBusqueda = async (req, res) => {
  try {
    const { keyword, tipoOperacion, estado, zona } = req.body;

    await Busqueda.create({
      keyword,
      tipoOperacion,
      estado,
      zona: zona || "No especificada",
      usuario: req.user?._id || null,
      inmobiliaria: req.user?.inmobiliaria || null
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Error al registrar búsqueda:", err);
    res.status(500).json({ msg: "Error interno" });
  }
};
