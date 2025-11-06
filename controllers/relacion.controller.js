const Relacion = require("../models/RelacionAgenteCliente");
const User = require("../models/User");

// Obtener o crear relación agente-cliente
exports.obtenerRelacion = async (req, res) => {
  try {
    const { clienteEmail } = req.params;
    const agenteId = req.user.id;

    const cliente = await User.findOne({ correo: clienteEmail });
    if (!cliente) return res.status(404).json({ msg: "Cliente no encontrado" });

    let relacion = await Relacion.findOne({ agente: agenteId, cliente: cliente._id });

    // Si no existe, se crea automáticamente
    if (!relacion) {
      relacion = await Relacion.create({ agente: agenteId, cliente: cliente._id });
    }

    res.json({ relacion });
  } catch (error) {
    console.error("Error al obtener relación:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

// Actualizar tipoCliente
exports.actualizarTipoCliente = async (req, res) => {
  try {
    const { clienteEmail, tipoCliente } = req.body;
    const agenteId = req.user.id;

    const cliente = await User.findOne({ correo: clienteEmail });
    if (!cliente) return res.status(404).json({ msg: "Cliente no encontrado" });

    const relacion = await Relacion.findOneAndUpdate(
      { agente: agenteId, cliente: cliente._id },
      { tipoCliente },
      { new: true, upsert: true }
    ).populate("cliente agente", "nombre correo");

    res.json({ msg: "Tipo de cliente actualizado correctamente", relacion });
  } catch (error) {
    console.error("Error al actualizar tipoCliente:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};
