const Colaboracion = require("../models/Colaboracion");
const User = require("../models/User");
const Propiedad = require("../models/Propiedad");
const Seguimiento = require("../models/Seguimiento");

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

    // 🔹 Crear colaboración base
    const nuevaColaboracion = await Colaboracion.create({
      agentePrincipal: agente._id,
      colaborador: colaborador?._id || null,
      tipoColaboracion,
      nombreColaborador: colaboradorNombreFinal,
      colaboradorEmail: colaboradorEmail || null,
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

        // Leads
        const leadsTotales = propiedad.contactosGenerados || 0;
        const esGanada = ['vendida', 'rentada', 'con inquilino'].includes(
          (propiedad.estadoPropiedad || '').toLowerCase()
        );
        const leadsGanados = esGanada ? 1 : 0;
        const leadsPerdidos = leadsTotales > 0 ? leadsTotales - leadsGanados : 0;

        // Conteo de agentes e inmobiliarias relacionadas
        let agentesInvolucrados = 0;
        if (propiedad.agente) agentesInvolucrados++;
        if (propiedad.inmobiliaria) agentesInvolucrados++;

        return {
          _id: c._id,
          // --- Propiedad ---
          nombrePropiedad: propiedad.clave || c.nombrePropiedad || 'Sin clave',
          tipoPropiedad: propiedad.tipoPropiedad || 'Sin tipo',
          imagenPropiedad:
            propiedad.imagenPrincipal ||
            c.imagenPropiedad ||
            'https://www.svgrepo.com/show/508699/home-4.svg',
          fechaAlta: propiedad.fechaCreacion || c.createdAt, // 👈 aseguramos que se envía la fecha

          // --- Datos principales de la colaboración ---
          tipoColaboracion: c.tipoColaboracion || '—',      // 👈 agrega tipo
          comision: c.comision || 0,                         // 👈 agrega comisión
          // --- Métricas ---
          agentesInvolucrados,
          leadsGenerados: leadsTotales,
          leadsGanados,
          leadsPerdidos,
          // --- Colaborador ---
          colaborador: {
            nombre: colaborador.nombre || c.nombreColaborador || 'Sin nombre',
            correo: colaborador.correo || c.colaboradorEmail || '—',
            fotoPerfil:
              colaborador.fotoPerfil ||
              'https://www.svgrepo.com/show/452030/avatar-default.svg',
          },
          // --- Extras ---
          tipoOperacion: c.tipoOperacion || propiedad.tipoOperacion || '—',
          estado: c.estado || 'pendiente',
        };
      })
    );

    // Ordenar por fecha
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
