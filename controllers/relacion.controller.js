const User = require("../models/User");
const Relacion = require("../models/RelacionAgenteCliente");
const bcrypt = require("bcryptjs");
const { resend } = require("../config/resend");
const { enviarAltaCliente } = require('../utils/mailerClientes');

// =========================
// 🔹 OBTENER CLIENTES DEL AGENTE (DIRECTORIO)
// =========================
// =========================
// 🔹 OBTENER CLIENTES DEL AGENTE (SOLO CLIENTES)
// =========================
exports.obtenerClientesDelAgente = async (req, res) => {
  try {
    const agenteId = req.params.agenteId;

    const relaciones = await Relacion.find({ agente: agenteId })
      .populate({
        path: "cliente",
        match: { rol: "cliente" }, // 👈 FILTRO CLAVE
        select: "nombre correo telefono tipoCliente"
      })
      .lean();

    const clientes = relaciones
      .filter(r => r.cliente) // 🔥 elimina agentes automáticamente
      .map(r => ({
        _id: r.cliente._id,
        nombre: r.cliente.nombre,
        email: r.cliente.correo,
        telefono: r.cliente.telefono || "—",
        tipoCliente: r.tipoCliente || r.cliente.tipoCliente || "—",
        tipoOperacion: r.tipoOperacion || "—", // 👈 FALTABA
        fechaRegistro: r.createdAt,
        origen: "relacion",
        status: "activo",
      }));

    res.json(clientes);
  } catch (error) {
    console.error("❌ Error obtenerClientesDelAgente:", error);
    res.status(500).json({ msg: "Error obteniendo clientes" });
  }
};


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
    const { nombre, email, telefono, tipoCliente, tipoOperacion } = req.body;

    // 1️⃣ Validar agente
    const agente = await User.findById(agenteId);
    if (!agente) {
      return res.status(404).json({ msg: "Agente no encontrado" });
    }

    // 3️⃣ Normalizar correo
    const correoNorm = email.toLowerCase().trim();

    // 4️⃣ Buscar cliente
    let cliente = await User.findOne({ correo: correoNorm });
    const esNuevo = !cliente;

    // 5️⃣ Generar contraseña temporal
    const tempPass = Math.random().toString(36).slice(-8);

    if (cliente) {
      // 🔁 Cliente existente
      cliente.password = tempPass; // plano → pre-save hashea
      cliente.telefono = telefono;
      cliente.tipoCliente = tipoCliente;
      await cliente.save();
    } else {
      // 🆕 Cliente nuevo
      cliente = await User.create({
        nombre,
        correo: correoNorm,
        telefono,
        tipoCliente,
        password: tempPass,
        rol: "cliente",
      });
    }

    // 6️⃣ Enviar correo
    await enviarAltaCliente({
      to: cliente.correo,
      nombreCliente: cliente.nombre,
      nombreAgente: agente.nombre,
      correo: cliente.correo,
      password: tempPass,
    });

    // 7️⃣ Verificar relación existente
    const existeRelacion = await Relacion.findOne({
      agente: agenteId,
      cliente: cliente._id,
    });

    if (existeRelacion) {
      return res.json({
        msg: "El cliente ya está asignado a este agente.",
        cliente,
      });
    }

    // 8️⃣ Crear relación (AQUÍ VA tipoOperacion)
    const relacion = await Relacion.create({
      agente: agenteId,
      cliente: cliente._id,
      tipoCliente,
      tipoOperacion, // 👈 AQUÍ
    });

    // 9️⃣ Respuesta final
    return res.json({
      msg: esNuevo ? "Cliente creado y asignado." : "Cliente asignado.",
      cliente,
      relacion,
    });

  } catch (err) {
    console.error("❌ Error crear cliente:", err);
    return res.status(500).json({ msg: "Error interno" });
  }
};
