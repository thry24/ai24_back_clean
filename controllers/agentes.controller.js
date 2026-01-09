const User = require("../models/User");

// =========================
// 🔹 OBTENER TODOS LOS AGENTES
// =========================
exports.obtenerAgentes = async (req, res) => {
  try {
    const agentes = await User.find({ rol: "agente" })
      .select(
        "nombre correo telefono tipoPlan planActivo planExpira createdAt fotoPerfil"
      )
      .sort({ createdAt: -1 })
      .lean();

    const resultado = agentes.map((a) => ({
      _id: a._id,
      nombre: a.nombre,
      email: a.correo,
      telefono: a.telefono || "—",
      plan: a.tipoPlan || "—",
      planActivo: a.planActivo ?? false,
      planExpira: a.planExpira,
      fechaRegistro: a.createdAt,
      foto: a.fotoPerfil,
      status: a.planActivo ? "activo" : "inactivo",
    }));

    res.json(resultado);
  } catch (error) {
    console.error("❌ Error obteniendo agentes:", error);
    res.status(500).json({ msg: "Error obteniendo agentes" });
  }
};
