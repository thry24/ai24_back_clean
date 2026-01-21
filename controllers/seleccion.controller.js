const SeleccionPropiedad = require('../models/SeleccionPropiedad');
const Seguimiento = require('../models/Seguimiento');
const Propiedad = require('../models/Propiedad');
const Colaboracion = require('../models/Colaboracion');
const Notificacion = require('../models/Notificacion');
const MensajeAgente = require('../models/MensajesAgente');
const ChecklistDocumento = require('../models/ChecklistDocumento');
const { enviarCorreoContactoAgente } = require('../utils/mailer');

const { enviarSolicitudColaboracion } =
  require('../utils/mailerColaboraciones');
/**
 * ==============================
 * 🟢 1. SELECCIÓN SIMPLE (LEGACY / APOYO)
 * ==============================
 * Solo guarda la selección y fechaEleccion
 */
exports.agregarSeleccion = async (req, res) => {
  try {
    const { seguimientoId, propiedadId, origen } = req.body;

    const seguimiento = await Seguimiento.findById(seguimientoId);
    if (!seguimiento) {
      return res.status(404).json({ msg: 'Seguimiento no encontrado' });
    }

    const estado =
      origen === 'CLIENTE'
        ? 'INTERESADA'
        : 'SUGERIDA';

    const seleccion = await SeleccionPropiedad.findOneAndUpdate(
      { seguimiento: seguimientoId, propiedad: propiedadId },
      {
        seguimiento: seguimientoId,
        clienteEmail: seguimiento.clienteEmail,
        agenteEmail: seguimiento.agenteEmail,
        propiedad: propiedadId,
        origen,
        estado
      },
      { upsert: true, new: true }
    );

    res.json({ ok: true, seleccion });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al registrar interés' });
  }
};

exports.confirmarEleccion = async (req, res) => {
  try {
    const { seguimientoId, propiedadId } = req.body;

    const seguimiento = await Seguimiento.findById(seguimientoId);
    if (!seguimiento) {
      return res.status(404).json({ msg: 'Seguimiento no encontrado' });
    }

    // 1️⃣ Marcar SOLO esa propiedad como CONFIRMADA
    await SeleccionPropiedad.updateMany(
      { seguimiento: seguimientoId },
      { estado: 'DESCARTADA' }
    );

    const seleccion = await SeleccionPropiedad.findOneAndUpdate(
      { seguimiento: seguimientoId, propiedad: propiedadId },
      { estado: 'CONFIRMADA' },
      { new: true }
    );

    // 2️⃣ AQUÍ SÍ se marca la fecha
    seguimiento.fechaEleccion = new Date();
    seguimiento.estatus = 'Elección confirmada';
    await seguimiento.save();

    res.json({ ok: true, seleccion });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al confirmar elección' });
  }
};

/**
 * ==============================
 * 🔵 2. OBTENER SELECCIÓN
 * ==============================
 */
exports.obtenerSeleccion = async (req, res) => {
  try {
    const { seguimientoId } = req.params;

    const seleccion = await SeleccionPropiedad.find({
    seguimiento: seguimientoId
    })
    .populate('propiedad')
    .sort({ createdAt: -1 });


    res.json(seleccion);
  } catch (err) {
    console.error('❌ obtenerSeleccion', err);
    res.status(500).json({ msg: 'Error al obtener selección' });
  }
};

/**
 * ==============================
 * 🔥 3. FLUJO COMPLETO (USAR EN FRONT)
 * ==============================
 * Selección + colaboración + notificación + mensaje
 */
exports.seleccionarPropiedadFlujoCompleto = async (req, res) => {
  try {
    const { seguimientoId, propiedadId, origen } = req.body;
    const user = req.user; // agente autenticado

    if (!seguimientoId || !propiedadId || !origen) {
      return res.status(400).json({ msg: 'Datos incompletos' });
    }

    // =========================
    // 1️⃣ Seguimiento
    // =========================
    const seguimiento = await Seguimiento.findById(seguimientoId);
    if (!seguimiento) {
      return res.status(404).json({ msg: 'Seguimiento no encontrado' });
    }

    // =========================
    // 2️⃣ Propiedad
    // =========================
    const propiedad = await Propiedad.findById(propiedadId).populate(
      'agente',
      'nombre correo email'
    );

    if (!propiedad || !propiedad.agente) {
      return res.status(404).json({ msg: 'Propiedad no encontrada' });
    }

    const correoAgentePropiedad =
      propiedad.agente.correo || propiedad.agente.email;

    const esPropiedadExterna =
      correoAgentePropiedad !== seguimiento.agenteEmail;

    // =========================
    // 3️⃣ Guardar selección
    // =========================
    const seleccion = await SeleccionPropiedad.findOneAndUpdate(
      { seguimiento: seguimientoId, propiedad: propiedadId },
      {
        seguimiento: seguimientoId,
        clienteEmail: seguimiento.clienteEmail,
        agenteEmail: seguimiento.agenteEmail,
        propiedad: propiedadId,
        origen,
        estado: 'SELECCIONADA',
      },
      { upsert: true, new: true }
    );
    // =========================
    // 4️⃣ Fecha elección (una sola vez)
    // =========================
    if (!seguimiento.fechaEleccion) {
      seguimiento.fechaEleccion = new Date();
      await seguimiento.save();
    }
    // 📩 Correo al propietario: cliente interesado
    await enviarCorreoContactoAgente({
      to: correoAgentePropiedad, // propietario / agente dueño
      agenteNombre: propiedad.agente.nombre,
      clienteNombre: seguimiento.clienteNombre || seguimiento.clienteEmail,
      tipoCliente: seguimiento.tipoOperacion === 'VENTA'
        ? 'Comprador'
        : 'Inquilino',
      propiedadClave: propiedad.clave,
      imagenPropiedad: propiedad.imagenPrincipal,
      mensaje: 'Un cliente ha seleccionado tu propiedad y desea continuar el proceso.'
    });
    await Notificacion.create({
      usuarioEmail: correoAgentePropiedad,
      mensaje: `Un cliente seleccionó tu propiedad ${propiedad.clave}.`,
      tipo: 'seguimiento',
      referenciaId: seguimiento._id
    });
    await Notificacion.create({
      usuarioEmail: seguimiento.clienteEmail,
      mensaje: `🎉 ¡Felicidades! Has seleccionado la propiedad ${propiedad.clave}. Tu asesor ${user.nombre} continuará con el proceso.`,
      tipo: 'seguimiento',
      referenciaId: seguimiento._id
    });

    // =========================
    // 5️⃣ Propiedad externa → colaboración
    // =========================
    if (esPropiedadExterna) {
      const colaboracion = await Colaboracion.findOneAndUpdate(
        {
          propiedad: propiedad._id,
          agenteEmail: correoAgentePropiedad,        // dueño
          colaboradorEmail: seguimiento.agenteEmail, // agente del cliente
        },
        {
          agentePrincipal: propiedad.agente._id,
          agenteEmail: correoAgentePropiedad,
          nombreAgente: propiedad.agente.nombre,

          colaboradorEmail: seguimiento.agenteEmail,
          nombreColaborador: user.nombre,

          propiedad: propiedad._id,
          nombrePropiedad: propiedad.clave,
          imagenPropiedad: propiedad.imagenPrincipal,
          tipoOperacion: propiedad.tipoOperacion.toUpperCase(),

          estado: 'pendiente',
          origen,
        },
        { upsert: true, new: true }
      );

      // 🔔 Notificación interna
      await Notificacion.create({
        usuarioEmail: correoAgentePropiedad,
        mensaje: `Un cliente seleccionó tu propiedad ${propiedad.clave} y solicita colaboración`,
        tipo: 'colaboracion',
        referenciaId: propiedad._id,
      });

      // 📧 Correo al agente dueño (TU MAILER)
      await enviarSolicitudColaboracion({
        to: correoAgentePropiedad,
        nombreColaborador: user.nombre,
        nombreAgente: user.nombre,
        nombrePropiedad: propiedad.clave,
        imagenPropiedad: propiedad.imagenPrincipal,
      });

      // 💬 MensajeAgente SOLO si viene del AGENTE
      if (origen === 'AGENTE') {
        await MensajeAgente.create({
          nombreAgente: propiedad.agente.nombre,
          emailAgente: correoAgentePropiedad,

          nombreCliente: seguimiento.clienteNombre,
          emailCliente: seguimiento.clienteEmail,

          texto: `Tengo un cliente interesado en la propiedad ${propiedad.clave}`,
          idPropiedad: propiedad._id,
          imagenPropiedad: propiedad.imagenPrincipal,
          tipoOperacion: propiedad.tipoOperacion,
          ubicacion: `${propiedad.direccion?.municipio}, ${propiedad.direccion?.estado}`,

          remitenteId: user._id, // ✔️ siempre existe aquí
        });
      }
    }

    return res.json({ ok: true, seleccion });

  } catch (err) {
    console.error('❌ seleccionarPropiedadFlujoCompleto', err);
    return res.status(500).json({ msg: 'Error en flujo de selección' });
  }
};

exports.sugerirPropiedad = async (req, res) => {
  try {
    const { seguimientoId, propiedadId } = req.body;
    const user = req.user;

    const seguimiento = await Seguimiento.findById(seguimientoId);
    if (!seguimiento) {
      return res.status(404).json({ msg: 'Seguimiento no encontrado' });
    }

    const propiedad = await Propiedad.findById(propiedadId);
    if (!propiedad) {
      return res.status(404).json({ msg: 'Propiedad no encontrada' });
    }

    // 🚫 NO duplicar sugerencias
    const existe = await SeleccionPropiedad.findOne({
      seguimiento: seguimientoId,
      propiedad: propiedadId,
      origen: 'AGENTE'
    });

    if (existe) return res.json(existe);

    const sugerencia = await SeleccionPropiedad.create({
      seguimiento: seguimientoId,
      propiedad: propiedadId,
      origen: 'AGENTE',
      estado: 'SUGERIDA',
      agenteEmail: seguimiento.agenteEmail,
      clienteEmail: seguimiento.clienteEmail
    });

    // ❌ NO fechaEleccion
    // ❌ NO colaboración
    // ❌ NO notificaciones aún

    res.json({ ok: true, sugerencia });

  } catch (err) {
    console.error('❌ sugerirPropiedad', err);
    res.status(500).json({ msg: 'Error al sugerir propiedad' });
  }
};
exports.confirmarEleccion = async (req, res) => {
  try {
    const { seguimientoId, propiedades } = req.body;
    const user = req.user;

    if (!seguimientoId || !Array.isArray(propiedades)) {
      return res.status(400).json({ msg: 'Datos inválidos' });
    }

    const seguimiento = await Seguimiento.findById(seguimientoId);
    if (!seguimiento) {
      return res.status(404).json({ msg: 'Seguimiento no encontrado' });
    }

    // 1️⃣ Marcar propiedades como CONFIRMADAS
    await SeleccionPropiedad.updateMany(
      {
        seguimiento: seguimientoId,
        propiedad: { $in: propiedades },
        origen: 'CLIENTE'
      },
      {
        estado: 'CONFIRMADA'
      }
    );

    // 2️⃣ Fecha elección (UNA SOLA VEZ)
    if (!seguimiento.fechaEleccion) {
      seguimiento.fechaEleccion = new Date();
    }

    // 3️⃣ Avanzar timeline
    if (!seguimiento.fechaCita) {
      seguimiento.estatus = 'EN PROCESO';
    }

    await seguimiento.save();

    // 🔔 4️⃣ Notificación al asesor
    await Notificacion.create({
      usuarioEmail: seguimiento.agenteEmail,
      mensaje: `El cliente confirmó ${propiedades.length} propiedad(es).`,
      tipo: 'seguimiento',
      referenciaId: seguimiento._id
    });

    res.json({ ok: true });

  } catch (err) {
    console.error('❌ confirmarEleccion', err);
    res.status(500).json({ msg: 'Error al confirmar elección' });
  }
};
