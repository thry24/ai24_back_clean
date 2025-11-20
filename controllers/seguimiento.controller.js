const Seguimiento = require("../models/Seguimiento");
const Relacion = require('../models/RelacionAgenteCliente'); // 👈 asegúrate de importar tu modelo de relación
const User = require("../models/User"); // 👈 tu modelo real
exports.crearOObtenerSeguimiento = async (req, res) => {
  try {
    const { clienteEmail, agenteEmail } = req.body;

    // 1️⃣ Buscar si ya existe
    let seguimiento = await Seguimiento.findOne({ clienteEmail, agenteEmail });

    if (!seguimiento) {
      // 2️⃣ Intentar traer el tipoCliente desde la relación
      const relacion = await Relacion.findOne({ clienteEmail, agenteEmail });
      const tipoCliente = relacion?.tipoCliente || null;

      // 3️⃣ Crear nuevo seguimiento con ese tipo
      seguimiento = new Seguimiento({
        ...req.body,
        tipoCliente,
      });
      await seguimiento.save();
    }

    res.status(200).json(seguimiento);
  } catch (err) {
    console.error('❌ Error creando seguimiento:', err);
    res.status(500).json({ msg: 'Error al crear seguimiento' });
  }
};
// ✅ Crear o devolver seguimiento existente sin reemplazar a otros
exports.createOrGetSeguimiento = async (req, res) => {
  try {
    const {
      clienteEmail,
      clienteNombre = "",
      agenteEmail,
      tipoOperacion = "",
    } = req.body;

    if (!clienteEmail || !agenteEmail) {
      return res.status(400).json({ message: "clienteEmail y agenteEmail son requeridos" });
    }

    // Normalizar correos
    const clienteEmailLower = clienteEmail.toLowerCase();
    const agenteEmailLower = agenteEmail.toLowerCase();

    // 🔍 Buscar los usuarios reales (por correo)
    const clienteUser = await User.findOne({ correo: clienteEmailLower });
    const agenteUser = await User.findOne({ correo: agenteEmailLower });

    if (!clienteUser || !agenteUser) {
      return res.status(404).json({ message: "No se encontraron los usuarios" });
    }

    // 🔎 Buscar si ya existe seguimiento (por emails)
    const existente = await Seguimiento.findOne({
      clienteEmail: clienteEmailLower,
      agenteEmail: agenteEmailLower,
    });

    if (existente) return res.json(existente);

    // 🧩 Buscar la relación cliente–agente por IDs
    const relacion = await Relacion.findOne({
      cliente: clienteUser._id,
      agente: agenteUser._id,
    });

    // ⚙️ Determinar tipoCliente desde la relación
    const tipoClienteFinal = relacion?.tipoCliente || "Sin definir";

    // 🆕 Crear el seguimiento con el tipoCliente correcto
    const nuevo = await Seguimiento.create({
      clienteEmail: clienteEmailLower,
      clienteNombre,
      agenteEmail: agenteEmailLower,
      tipoCliente: tipoClienteFinal,
      tipoOperacion,
      fechaPrimerContacto: new Date(),
    });

    return res.status(201).json(nuevo);
  } catch (err) {
    console.error("❌ createOrGetSeguimiento error:", err);
    return res.status(500).json({ message: "Error creando seguimiento" });
  }
};


// ✅ Obtener todos los seguimientos de un agente
// ✅ Obtener todos los seguimientos de un agente
exports.getByAgente = async (req, res) => {
  try {
    // 🔥 Decodificar por si viene como %40
    const rawEmail = req.params.agenteEmail;
    const agenteEmail = decodeURIComponent(rawEmail).toLowerCase();

    if (!agenteEmail) {
      return res.status(400).json({ message: "agenteEmail requerido" });
    }

    // Buscar coincidencias exactas por email del agente
    const seguimientos = await Seguimiento.find({
      agenteEmail: agenteEmail,
    }).sort({ updatedAt: -1 });

    return res.json(seguimientos);
  } catch (err) {
    console.error("❌ getByAgente error:", err);
    return res.status(500).json({ message: "Error obteniendo seguimientos" });
  }
};


// ✅ Obtener seguimiento por cliente/agente
exports.getByClienteAgente = async (req, res) => {
  try {
    const { clienteEmail, agenteEmail } = req.query;
    if (!clienteEmail || !agenteEmail) {
      return res
        .status(400)
        .json({ message: "clienteEmail y agenteEmail requeridos" });
    }
    const seg = await Seguimiento.findOne({
      clienteEmail: clienteEmail.toLowerCase(),
      agenteEmail: agenteEmail.toLowerCase(),
    });
    if (!seg) return res.status(404).json({ message: "No encontrado" });
    return res.json(seg);
  } catch (err) {
    console.error("getByClienteAgente error:", err);
    return res.status(500).json({ message: "Error" });
  }
};

// ✅ Actualizar seguimiento
exports.patchSeguimiento = async (req, res) => {
  try {
    const { id } = req.params;
    const cambios = req.body || {};

    const seg = await Seguimiento.findByIdAndUpdate(id, { $set: cambios }, { new: true });
    if (!seg) return res.status(404).json({ message: "No encontrado" });
    return res.json(seg);
  } catch (err) {
    console.error("patchSeguimiento error:", err);
    return res.status(500).json({ message: "Error actualizando seguimiento" });
  }
};
// controllers/seguimientoController.js
exports.getSeguimientosPorAgente = async (req, res) => {
  try {
    const agenteId = req.params.agenteId;

    // Obtén email del agente (porque tu modelo usa agenteEmail, no id)
    const agente = await User.findById(agenteId);
    if (!agente) {
      return res.status(404).json({ ok: false, msg: "Agente no encontrado" });
    }

    const seguimientos = await Seguimiento.find({
      agenteEmail: agente.correo
    });

    res.json({ ok: true, seguimientos });

  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, msg: "Error obteniendo seguimientos" });
  }
};
exports.getByInmobiliaria = async (req, res) => {
  try {
    const { inmobiliariaId } = req.params;

    // 1. Obtener los agentes que pertenecen a esa inmobiliaria
    const agentes = await User.find({ inmobiliaria: inmobiliariaId });

    if (!agentes.length) {
      return res.json({ seguimientos: [] });
    }

    const correos = agentes.map(a => a.correo);

    // 2. Traer todos los seguimientos de esos agentes
    const seguimientos = await Seguimiento.find({
      agenteEmail: { $in: correos }
    }).sort({ createdAt: -1 });

    return res.json({ seguimientos });

  } catch (error) {
    console.error("Error obteniendo seguimientos:", error);
    return res.status(500).json({ msg: "Error interno del servidor" });
  }
};