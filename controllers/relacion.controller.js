const User = require("../models/User");
const Relacion = require("../models/RelacionAgenteCliente");
const bcrypt = require("bcryptjs");
const { resend } = require("../config/resend");

// =========================
// 🔹 OBTENER RELACIÓN
// =========================
exports.obtenerRelacion = async (req, res) => {
  try {
    const { clienteEmail } = req.params;
    const agenteId = req.user.id;


    const cliente = await User.findOne({ correo: clienteEmail });
    if (!cliente)
      return res.status(404).json({ msg: "Cliente no encontrado" });

    let relacion = await Relacion.findOne({ agente: agenteId, cliente: cliente._id });

    if (!relacion) {
      relacion = await Relacion.create({
        agente: agenteId,
        cliente: cliente._id
      });
    }

    res.json({ relacion });

  } catch (error) {
    console.error("Error obtenerRelacion:", error);
    res.status(500).json({ msg: "Error interno" });
  }
};

// =========================
// 🔹 ACTUALIZAR TIPO CLIENTE
// =========================
exports.actualizarTipoCliente = async (req, res) => {
  try {
    const { clienteEmail, tipoCliente } = req.body;
    const agenteId = req.user.id;

    const cliente = await User.findOne({ correo: clienteEmail });
    if (!cliente)
      return res.status(404).json({ msg: "Cliente no encontrado" });

    const relacion = await Relacion.findOneAndUpdate(
      { agente: agenteId, cliente: cliente._id },
      { tipoCliente },
      { new: true, upsert: true }
    );

    res.json({ msg: "Tipo cliente actualizado", relacion });

  } catch (error) {
    console.error("Error actualizarTipoCliente:", error);
    res.status(500).json({ msg: "Error interno" });
  }
};

// =========================
// 🔹 AGREGAR CLIENTE (TU FUNCIÓN)
// =========================
function limitePorPlan(plan) {
  switch (plan) {
    case "mensual": return 5;
    case "semestral": return 10;
    case "anual": return 20;
    default: return 5;
  }
}

exports.agenteCreaCliente = async (req, res) => {
  try {
    const agenteId = req.user._id;
    const { nombre, email, telefono, tipoCliente } = req.body;

    const agente = await User.findById(agenteId);
    if (!agente) return res.status(404).json({ msg: "Agente no encontrado" });

    const limite = limitePorPlan(agente.tipoPlan);
    const usados = await Relacion.countDocuments({ agente: agenteId });

    if (usados >= limite) {
      return res.status(403).json({
        msg: `Tu plan (${agente.tipoPlan}) permite solo ${limite} clientes.`,
      });
    }

    let cliente = await User.findOne({ correo: email });

    let esNuevo = false;

    if (!cliente) {
      esNuevo = true;
      const tempPass = Math.random().toString(36).slice(-8);
      const hash = await bcrypt.hash(tempPass, 10);

      cliente = await User.create({
        nombre,
        correo: email,
        telefono,
        password: hash,
        rol: "cliente",
        tipoCliente,
        origen: "relacion",
      });

      await resend.emails.send({
        from: "Thry24 <verificaciones@thry24.com>",
        to: email,
        subject: "Bienvenido a Thry24 🚀",
        html: `
          <h2>Bienvenido a Thry24</h2>
          <p>Has sido registrado por tu agente <b>${agente.nombre}</b>.</p>
          <p><b>Correo:</b> ${email}</p>
          <p><b>Contraseña temporal:</b> ${tempPass}</p>
        `,
      });
    }

    const existeRelacion = await Relacion.findOne({
      agente: agenteId,
      cliente: cliente._id
    });

    if (existeRelacion) {
      return res.json({
        msg: "El cliente ya está asignado a este agente.",
        cliente,
      });
    }

    const relacion = await Relacion.create({
      agente: agenteId,
      cliente: cliente._id,
      tipoCliente
    });

    res.json({
      msg: esNuevo ? "Cliente creado y asignado." : "Cliente asignado.",
      cliente,
      relacion
    });

  } catch (err) {
    console.error("Error crear cliente:", err);
    res.status(500).json({ msg: "Error interno" });
  }
};
