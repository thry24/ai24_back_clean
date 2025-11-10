const Colaboracion = require("../models/Colaboracion");
const User = require("../models/User");
const Propiedad = require("../models/Propiedad");
const Seguimiento = require("../models/Seguimiento");
const { sendColaboracionNotificacion } = require("../utils/sendVerificationCode");

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
    const { accion } = req.body;
    const email = (req.user?.correo || req.user?.email || "").toLowerCase();

    const colaboracion = await Colaboracion.findById(id)
      .populate("agentePrincipal", "nombre apellidos correo")
      .populate("colaborador", "nombre apellidos correo");

    if (!colaboracion)
      return res.status(404).json({ ok: false, message: "Colaboración no encontrada." });

    // Solo el colaborador puede responder
    if (colaboracion.colaboradorEmail?.toLowerCase() !== email) {
      return res
        .status(403)
        .json({ ok: false, message: "No autorizado para responder esta colaboración." });
    }

    // Actualizar estado
    if (accion === "aceptar") colaboracion.estado = "aceptada";
    else if (accion === "rechazar") colaboracion.estado = "rechazada";
    else return res.status(400).json({ ok: false, message: "Acción inválida." });

    await colaboracion.save();

    // 💌 Enviar correo al agente principal
    const agenteEmail = colaboracion.agenteEmail || colaboracion.agentePrincipal?.correo;
    const colaboradorNombre =
      colaboracion.nombreColaborador ||
      `${colaboracion.colaborador?.nombre || ""} ${colaboracion.colaborador?.apellidos || ""}`.trim();

    if (agenteEmail) {
      await sendColaboracionNotificacion({
        agenteEmail,
        colaboradorNombre,
        colaboradorEmail: colaboracion.colaboradorEmail,
        accion,
        propiedad: colaboracion.nombrePropiedad,
      });
    }

    res.json({
      ok: true,
      message: `Colaboración ${colaboracion.estado}. Se notificó al agente principal.`,
      colaboracion,
    });
  } catch (err) {
    console.error("❌ Error al responder colaboración:", err);
    res.status(500).json({ ok: false, message: "Error al responder colaboración." });
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
    const email = (req.params.email || req.query.email || '').toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ ok: false, message: 'Falta el email del agente.' });
    }

    // 🔹 Buscar agente principal
    const agente = await User.findOne({ correo: email });
    if (!agente) {
      return res.status(404).json({ ok: false, message: 'Agente no encontrado.' });
    }

    // 🔹 Buscar colaboraciones en las que participa
    const colaboraciones = await Colaboracion.find({
      $or: [
        { agentePrincipal: agente._id },
        { colaboradorEmail: email }
      ],
    })
      .populate('propiedad', 'clave tipoPropiedad imagenPrincipal contactosGenerados estadoPropiedad agente inmobiliaria fechaCreacion')
      .populate('colaborador', 'nombre correo fotoPerfil')
      .populate('agentePrincipal', 'nombre correo fotoPerfil')
      .lean();

    if (!colaboraciones.length) return res.json([]);

    // 🔹 Construir respuesta enriquecida
    const lista = await Promise.all(
      colaboraciones.map(async (c) => {
        const propiedad = c.propiedad || {};
        const colaborador = c.colaborador || {};
        const agentePrincipal = c.agentePrincipal || {};

        // 🔹 Buscar seguimientos reales de esta propiedad
        const seguimientos = await Seguimiento.find({ propiedadId: propiedad._id }).lean();

        // 🔹 Calcular métricas reales
        const leadsTotales = seguimientos.length;

        const leadsGanados = seguimientos.filter((s) =>
          ['CERRADO', 'FIRMADO', 'CONTRATO', 'VENDIDA', 'RENTADA', 'CONTRATO FIRMADO'].includes(
            (s.estadoFinal || '').toUpperCase()
          )
        ).length;

        const leadsPerdidos = seguimientos.filter((s) =>
          ['CANCELADO', 'PERDIDO', 'NO CONCRETADO', 'DESCARTADO', 'SIN RESPUESTA'].includes(
            (s.estadoFinal || '').toUpperCase()
          )
        ).length;

        // Conteo de agentes e inmobiliarias relacionadas
        let agentesInvolucrados = 0;
        if (propiedad.agente) agentesInvolucrados++;
        if (propiedad.inmobiliaria) agentesInvolucrados++;

        // --- NUEVO: Agregar nombre del agente principal ---
        const nombreAgente =
          agentePrincipal.nombre ||
          c.nombreAgente ||
          'Agente sin nombre';

        // --- NUEVO: nombre visible dinámico (para quien consulta) ---
        const soyAgente = agentePrincipal.correo?.toLowerCase() === email;
        const nombreVisible = soyAgente
          ? (colaborador.nombre || c.nombreColaborador || 'Colaborador')
          : nombreAgente;
            return {
              _id: c._id,

              // --- Propiedad ---
              nombrePropiedad: propiedad.clave || c.nombrePropiedad || 'Sin clave',
              tipoPropiedad: propiedad.tipoPropiedad || 'Sin tipo',
              imagenPropiedad:
                propiedad.imagenPrincipal ||
                'https://www.svgrepo.com/show/508699/home-4.svg',
              fechaAlta: propiedad.fechaCreacion || c.createdAt,

              // --- Datos principales ---
              tipoColaboracion: c.tipoColaboracion || '—',
              comision: c.comision || 0,
              tipoOperacion: c.tipoOperacion || propiedad.tipoOperacion || '—',
              estado: c.estado || 'pendiente',

              // --- Métricas ---
              agentesInvolucrados,
              leadsGenerados: leadsTotales,
              leadsGanados,
              leadsPerdidos,

              // --- Participantes ---
              colaborador: {
                nombre: colaborador.nombre || c.nombreColaborador || 'Sin nombre',
                correo: colaborador.correo || c.colaboradorEmail || '—',
                fotoPerfil:
                  colaborador.fotoPerfil ||
                  'https://www.svgrepo.com/show/452030/avatar-default.svg',
              },
              agentePrincipal: {
                nombre: nombreAgente,
                correo: agentePrincipal.correo || '—',
                fotoPerfil:
                  agentePrincipal.fotoPerfil ||
                  'https://www.svgrepo.com/show/452030/avatar-default.svg',
              },

              // --- NUEVO: campos para el frontend ---
              agentePrincipalNombre: nombreAgente,
              agentePrincipalFoto:
                agentePrincipal.fotoPerfil ||
                'https://www.svgrepo.com/show/452030/avatar-default.svg',
              nombreColaborador:
                colaborador.nombre || c.nombreColaborador || 'Sin nombre',
              colaboradorFoto:
                colaborador.fotoPerfil ||
                'https://www.svgrepo.com/show/452030/avatar-default.svg',

              nombreAgente,
              nombreVisible,
            };
      })
    );

    // 🔹 Ordenar por fecha
    lista.sort(
      (a, b) => new Date(b.fechaAlta).getTime() - new Date(a.fechaAlta).getTime()
    );

    return res.json(lista);
  } catch (err) {
    console.error('❌ Error al obtener colaboraciones:', err);
    res.status(500).json({ ok: false, message: 'Error al cargar colaboraciones.' });
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
