const Colaboracion = require("../models/Colaboracion");
const User = require("../models/User");
const Propiedad = require("../models/Propiedad");
const Seguimiento = require("../models/Seguimiento");
const Notificacion = require('../models/Notificacion');
const { sendColaboracionNotificacion } = require("../utils/sendVerificationCode");
const { enviarSolicitudColaboracion } = require('../utils/mailerColaboraciones');


exports.crearColaboracion = async (req, res) => {
  try {
    const {
      agenteEmail,
      tipoColaboracion,
      colaboradorEmail,
      nombreColaborador,
      propiedadId,
      tipoOperacion,
      comision,
      nota,
      seguimientoActivo,
    } = req.body;

    // 🟡 Validación básica
    if (!agenteEmail || !tipoOperacion) {
      return res.status(400).json({ ok: false, message: "Faltan datos obligatorios" });
    }

    // 🔹 Buscar agente principal
    const agente = await User.findOne({ correo: agenteEmail.toLowerCase() });
    if (!agente) {
      return res.status(404).json({ ok: false, message: "Agente no encontrado" });
    }

    // 🔹 Buscar colaborador si existe
    let colaborador = null;
    let colaboradorNombreFinal = nombreColaborador;
    if (tipoColaboracion !== "manual" && colaboradorEmail) {
      colaborador = await User.findOne({ correo: colaboradorEmail.toLowerCase() });
      colaboradorNombreFinal = colaborador?.nombre || nombreColaborador || "Colaborador externo";
    }

    // 🔹 Buscar propiedad si fue seleccionada
    const propiedad = propiedadId ? await Propiedad.findById(propiedadId) : null;

    const nuevaColaboracion = await Colaboracion.create({
      agentePrincipal: agente._id,
      nombreAgente: agente.nombre || "Agente sin nombre",
      agenteEmail: agente.correo,
      colaborador: colaborador?._id || null,
      nombreColaborador: colaboradorNombreFinal,
      colaboradorEmail: colaboradorEmail || null,
      tipoColaboracion,
      propiedad: propiedad?._id || null,
      nombrePropiedad: propiedad?.clave || propiedad?.tipoPropiedad || "Sin nombre",
      imagenPropiedad: propiedad?.imagenPrincipal || "",
      tipoOperacion: tipoOperacion.toUpperCase(),
      comision,
      nota,
      seguimientoActivo,
      estado: tipoColaboracion === "externo" ? "pendiente" : "aceptada",
    });

     // 📧 ENVIAR CORREO SOLO SI ES EXTERNO Y ESTÁ PENDIENTE
    if (tipoColaboracion === 'externo' && colaboradorEmail) {
      await enviarSolicitudColaboracion({
        to: colaboradorEmail,
        nombreColaborador: colaboradorNombreFinal,
        nombreAgente: agente.nombre,
        nombrePropiedad: propiedad?.clave || 'Propiedad sin nombre',
        imagenPropiedad: propiedad?.imagenPrincipal || '',
      });
    }
    // 🟢 NUEVO: si hay propiedad asociada, incrementa los leads generados
    if (propiedadId) {
      await Propiedad.findByIdAndUpdate(propiedadId, {
        $inc: { contactosGenerados: 1 }, // suma un lead
      });
    }

    // 🔹 Crear o reutilizar seguimiento
    if (seguimientoActivo) {
      let seguimientoExistente = await Seguimiento.findOne({
        clienteEmail: colaboradorEmail || agente.correo,
        agenteEmail: agente.correo,
      });

      if (!seguimientoExistente) {
        seguimientoExistente = await Seguimiento.create({
          clienteEmail: colaboradorEmail || agente.correo,
          clienteNombre: colaboradorNombreFinal,
          agenteEmail: agente.correo,
          tipoCliente: "colaboracion",
          tipoOperacion: tipoOperacion.toUpperCase(),
          origen: "colaboraciones",
          fechaPrimerContacto: new Date(),
        });
      }

      nuevaColaboracion.seguimiento = seguimientoExistente._id;
      await nuevaColaboracion.save();
    }
    // ✅ Respuesta elegante para frontend
    res.status(201).json({
      ok: true,
      message:
        "✅ " +
        (seguimientoActivo
          ? "Colaboración creada, seguimiento vinculado y lead contabilizado correctamente."
          : "Colaboración creada y lead contabilizado correctamente."),
      colaboracion: nuevaColaboracion,
    });
  } catch (err) {
    console.error("❌ Error creando colaboración:", err);
    const msg =
      err.code === 11000
        ? "Ya existe un seguimiento entre este cliente y agente ⚠️"
        : "Error al crear colaboración";
    res.status(500).json({ ok: false, message: msg });
  }
};

exports.actualizarEstadoColaboracion = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body; // 'ganado' o 'perdido'

  const colab = await Colaboracion.findByIdAndUpdate(id, { estado }, { new: true });
  if (colab?.propiedad) {
    const update = {};
    if (estado === 'ganado') update.$inc = { leadsGanados: 1 };
    if (estado === 'perdido') update.$inc = { leadsPerdidos: 1 };
    await Propiedad.findByIdAndUpdate(colab.propiedad, update);
  }

  res.json({ ok: true, message: 'Estado actualizado y métricas ajustadas', colaboracion: colab });
};

exports.responderColaboracion = async (req, res) => {
  try {
    const { id } = req.params;
    const { accion } = req.body; // aceptar | rechazar

    if (!['aceptar', 'rechazar'].includes(accion)) {
      return res.status(400).json({ message: 'Acción no válida' });
    }

    const nuevoEstado = accion === 'aceptar'
      ? 'aceptada'
      : 'rechazada';

    const colaboracion = await Colaboracion.findByIdAndUpdate(
      id,
      {
        estado: nuevoEstado,
        updatedAt: new Date(),
      },
      {
        new: true,
        runValidators: false, // 🔥 CLAVE
      }
    );

    if (!colaboracion) {
      return res.status(404).json({ message: 'Colaboración no encontrada' });
    }

    return res.json({
      ok: true,
      message:
        nuevoEstado === 'aceptada'
          ? 'Colaboración aceptada correctamente'
          : 'Colaboración rechazada',
      colaboracion,
    });

  } catch (error) {
    console.error('❌ responderColaboracion', error);
    return res.status(500).json({
      message: 'Error al responder colaboración',
    });
  }
};


/**
 * ✅ Aceptar colaboración
 */
exports.aceptarColaboracion = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const colab = await Colaboracion.findById(id);
    if (!colab) {
      return res.status(404).json({ msg: 'Colaboración no encontrada' });
    }

    colab.estado = 'aceptada';
    await colab.save();

    // 🔔 Notificar al agente que trae al cliente
    await Notificacion.create({
      usuarioEmail: colab.agenteEmail,
      mensaje: `El agente ${user.nombre} aceptó colaborar contigo en la propiedad ${colab.nombrePropiedad}`,
      tipo: 'contacto',
      referenciaId: colab.propiedad,
    });

    res.json({ ok: true, colab });
  } catch (err) {
    console.error('❌ aceptarColaboracion', err);
    res.status(500).json({ msg: 'Error al aceptar colaboración' });
  }
};

/**
 * ❌ Rechazar colaboración
 */
exports.rechazarColaboracion = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const user = req.user;

    const colab = await Colaboracion.findById(id);
    if (!colab) {
      return res.status(404).json({ msg: 'Colaboración no encontrada' });
    }

    colab.estado = 'rechazada';
    colab.nota = motivo || '';
    await colab.save();

    await Notificacion.create({
      usuarioEmail: colab.agenteEmail,
      mensaje: `El agente ${user.nombre} rechazó la colaboración en la propiedad ${colab.nombrePropiedad}`,
      tipo: 'contacto',
      referenciaId: colab.propiedad,
    });

    res.json({ ok: true, colab });
  } catch (err) {
    console.error('❌ rechazarColaboracion', err);
    res.status(500).json({ msg: 'Error al rechazar colaboración' });
  }
};
exports.obtenerPorInmobiliaria = async (req, res) => {
  try {
    const inmobiliariaId = req.params.id;

    if (!inmobiliariaId) {
      return res.status(400).json({ ok: false, message: "Falta el ID de la inmobiliaria." });
    }

    // 1️⃣ Buscar agentes de esa inmobiliaria
    const agentes = await User.find({ inmobiliaria: inmobiliariaId })
                              .select("_id nombre correo fotoPerfil");

    if (!agentes.length) {
      return res.json([]);
    }

    const agentesIds = agentes.map(a => a._id);
    const agentesEmails = agentes.map(a => a.correo.toLowerCase());

    // 2️⃣ Buscar colaboraciones donde intervienen esos agentes
    const colaboraciones = await Colaboracion.find({
      $or: [
        { agentePrincipal: { $in: agentesIds } },
        { colaborador: { $in: agentesIds } },
        { colaboradorEmail: { $in: agentesEmails } }
      ]
    })
    .populate("propiedad", "clave tipoPropiedad imagenPrincipal fechaCreacion agente inmobiliaria contactosGenerados")
    .populate("colaborador", "nombre correo fotoPerfil")
    .populate("agentePrincipal", "nombre correo fotoPerfil")
    .lean();

    // 3️⃣ Procesar resultado
    const lista = colaboraciones.map(c => ({
      _id: c._id,
      tipoOperacion: c.tipoOperacion,
      estado: c.estado,
      tipoColaboracion: c.tipoColaboracion,

      // propiedad
      nombrePropiedad: c.propiedad?.clave || c.nombrePropiedad || "Sin nombre",
      imagenPropiedad: c.propiedad?.imagenPrincipal || "",
      fechaAlta: c.propiedad?.fechaCreacion || c.createdAt,

      // métrica simple
      leadsGenerados: c.propiedad?.contactosGenerados || 0,

      colaborador: {
        nombre: c.colaborador?.nombre || c.nombreColaborador,
        correo: c.colaborador?.correo || c.colaboradorEmail,
        foto: c.colaborador?.fotoPerfil,
      },

      agentePrincipal: {
        nombre: c.agentePrincipal?.nombre,
        correo: c.agentePrincipal?.correo,
        foto: c.agentePrincipal?.fotoPerfil,
      }
    }));

    res.json(lista);

  } catch (err) {
    console.error("❌ Error al obtener colaboraciones por inmobiliaria:", err);
    res.status(500).json({ ok: false, message: "Error al obtener datos." });
  }
};

exports.obtenerTodas = async (req, res) => {
  try {
    const propiedades = await Property.find().lean();

    const propiedadesConLeads = await Promise.all(
      propiedades.map(async (p) => {
        const propiedadId = p._id?.toString();

        // Buscar todos los seguimientos relacionados a esa propiedad
        const seguimientos = await Seguimiento.find({ propiedadId }).lean();

        const leadsGenerados = seguimientos.length;
        const leadsGanados = seguimientos.filter((s) =>
          ['CERRADO', 'FIRMADO', 'CONTRATO', 'VENDIDA', 'RENTADA'].includes(
            (s.estadoFinal || '').toUpperCase()
          )
        ).length;
        const leadsPerdidos = seguimientos.filter((s) =>
          ['CANCELADO', 'PERDIDO', 'NO CONCRETADO', 'DESCARTADO'].includes(
            (s.estadoFinal || '').toUpperCase()
          )
        ).length;

        return {
          ...p,
          leadsGenerados,
          leadsGanados,
          leadsPerdidos,
        };
      })
    );

    res.json(propiedadesConLeads);
  } catch (error) {
    console.error('Error al obtener propiedades:', error);
    res.status(500).json({ error: 'Error al obtener propiedades' });
  }
};


exports.obtenerPorAgente = async (req, res) => {
  try {
    const emailRaw = req.params.email || req.query.email;
    const email = (emailRaw || '').toLowerCase().trim();

    if (!email) {
      return res.status(400).json({ message: 'Falta email del agente' });
    }

    const usuario = await User.findOne({
      $or: [{ correo: email }, { email }]
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Agente no encontrado' });
    }

    const colaboraciones = await Colaboracion.find({
      $or: [
        { agentePrincipal: usuario._id },   // 🏠 dueño
        { colaboradorEmail: email }         // 🤝 colaborador
      ]
    })
      .populate('propiedad', 'clave imagenPrincipal comision')
      .populate('agentePrincipal', 'nombre correo')
      .lean();

    const lista = colaboraciones.map(c => {
      const soyAgentePrincipal =
        c.agentePrincipal?.correo?.toLowerCase() === email;

      return {
        _id: c._id,
        fechaAlta: c.createdAt,

        nombrePropiedad: c.nombrePropiedad || c.propiedad?.clave || '—',
        imagenPropiedad:
          c.imagenPropiedad ||
          c.propiedad?.imagenPrincipal ||
          null,

        tipoOperacion: c.tipoOperacion,

        // ✅ COMISIÓN REAL
                comision: c.propiedad?.comision?.porcentaje ?? 0,

        estado: c.estado,

        // 🔑 SOLO ESTA FLAG IMPORTA PARA ACCIONES
        puedeResponder: soyAgentePrincipal && c.estado === 'pendiente',

        // Texto visible
        nombreVisible: soyAgentePrincipal
          ? c.nombreColaborador
          : c.nombreAgente
      };
    });

    return res.json(lista);
  } catch (err) {
    console.error('❌ obtenerPorAgente', err);
    res.status(500).json({ message: 'Error al obtener colaboraciones' });
  }
};


// 🔹 Aceptar o rechazar colaboración
exports.actualizarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const colab = await Colaboracion.findById(id);
    if (!colab) {
      return res.status(404).json({ message: "Colaboración no encontrada" });
    }

    colab.estado = estado;
    await colab.save();

    res.json(colab);
  } catch (err) {
    console.error("❌ Error actualizando colaboración:", err);
    res.status(500).json({ message: "Error actualizando colaboración" });
  }
};
