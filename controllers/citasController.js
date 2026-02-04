const Cita = require('../models/Cita');
const Seguimiento = require('../models/Seguimiento');
const User = require("../models/User"); 
const Propiedad = require("../models/Propiedad"); 
const Colaboracion = require('../models/Colaboracion');
const Notificacion = require('../models/Notificacion');
const { obtenerDiaSemana } = require('../utils/fechas');
const Recorrido = require('../models/Recorrido');
const { enviarCitaAgendada } = require('../utils/enviarCitaAgendada');
const { crearNotificacion } = require('../utils/notificaciones');
const {
  enviarUbicacionCita
} = require('../utils/mailer'); // ajusta la ruta

// helper: compone Date real (UTC) con "YYYY-MM-DD" + "HH:mm"
function parseFechaHora(fechaStr, horaStr) {
  if (!fechaStr || !horaStr) return null;
  const [y, m, d] = String(fechaStr).split('-').map(Number);
  const [H, Mi]   = String(horaStr).split(':').map(Number);
  if (!y || !m || !d || isNaN(H) || isNaN(Mi)) return null;
  // UTC para evitar corrimientos por timezone
  return new Date(Date.UTC(y, (m - 1), d, H, Mi, 0, 0));
}

// GET /api/citas/horas?agenteEmail=...&fecha=YYYY-MM-DD
exports.getHorasDisponibles = async (req, res) => {
  try {
    const { agenteEmail, fecha } = req.query;

    if (!agenteEmail || !fecha) {
      return res.status(400).json({ msg: 'Faltan datos' });
    }

    // 🛡️ VALIDACIÓN REAL
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({
        msg: 'Formato de fecha inválido, usa YYYY-MM-DD'
      });
    }

    const start = new Date(`${fecha}T00:00:00.000Z`);
    const end   = new Date(`${fecha}T23:59:59.999Z`);

    const citas = await Cita.find({
      agenteEmail,
      fecha: { $gte: start, $lte: end },
      estado: { $ne: 'cancelada' }
    }).select('hora -_id');

    const ocupadas = new Set(citas.map(c => c.hora));

    const base = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];
    const libres = base.filter(h => !ocupadas.has(h));

    res.json({ horas: libres });

  } catch (err) {
    console.error('getHorasDisponibles error:', err);
    res.status(500).json({ msg: 'Error obteniendo horas' });
  }
};


// GET /api/citas?agenteEmail=...
exports.listarCitasPorAgente = async (req, res) => {
  try {
    const { agenteEmail } = req.query;
    if (!agenteEmail) return res.status(400).json({ msg: 'Falta agenteEmail' });

    const citas = await Cita.find({ agenteEmail }).sort({ fecha: 1, hora: 1 });
    res.json(citas);
  } catch (e) {
    console.error('listarCitasPorAgente error:', e);
    res.status(500).json({ msg: 'Error listando citas' });
  }
};

exports.crearCita = async (req, res) => {
  try {
    console.log('🔥 CREAR CITA NUEVA VERSION', req.body);

    const { seguimientoId, propiedadId, fecha, hora } = req.body;

    if (!seguimientoId || !propiedadId || !fecha || !hora) {
      return res.status(400).json({ msg: 'Campos obligatorios faltantes' });
    }

    // 🔎 Obtener seguimiento REAL
    const seguimiento = await Seguimiento.findById(seguimientoId).lean();
    if (!seguimiento) {
      return res.status(404).json({ msg: 'Seguimiento no encontrado' });
    }

    // 🔎 Obtener propiedad REAL
    const propiedad = await Propiedad.findById(propiedadId).lean();
    if (!propiedad) {
      return res.status(404).json({ msg: 'Propiedad no encontrada' });
    }

    // 🕒 Parsear fecha + hora
    const fechaReal = new Date(`${fecha}T${hora}:00`);
    if (isNaN(fechaReal.getTime())) {
      return res.status(400).json({ msg: 'Fecha u hora inválida' });
    }

    // 🛑 Verificar choque de horario
    const yaExiste = await Cita.findOne({
      agenteEmail: seguimiento.agenteEmail,
      fecha: fechaReal,
      hora
    });

    if (yaExiste) {
      return res.status(409).json({ msg: 'El agente ya tiene una cita en esa hora' });
    }

    // ✅ Crear cita
    const cita = await Cita.create({
      seguimientoId,
      propiedadId,
      agenteEmail: seguimiento.agenteEmail,
      agenteNombre: seguimiento.agenteNombre || '',
      clienteEmail: seguimiento.clienteEmail,
      clienteNombre: seguimiento.clienteNombre || '',
      tipoCliente: seguimiento.tipoCliente || '',
      tipoOperacion: seguimiento.tipoOperacion,
      propiedadClave: propiedad.clave || '',
      tipoEvento: 'Recorrido',
      fecha: fechaReal,
      hora
    });

    // ✅ Actualizar seguimiento
    await Seguimiento.findByIdAndUpdate(seguimientoId, {
      fechaCita: fechaReal,
      estatus: 'Cita programada'
    });

    return res.json({ ok: true, cita });

  } catch (err) {
    console.error('❌ crearCita error:', err);
    return res.status(500).json({ msg: 'Error al crear cita' });
  }
};

exports.crearCitaDesdeRecorrido = async (req, res) => {
  try {
    const { recorridoId, fecha, hora } = req.body;
    const userEmail = (req.user.email || req.user.correo).toLowerCase();

    if (!recorridoId || !fecha || !hora) {
      return res.status(400).json({ msg: 'Datos incompletos' });
    }

    // 1️⃣ Recorrido
    const recorrido = await Recorrido.findById(recorridoId);
    if (!recorrido || !recorrido.confirmado) {
      return res.status(400).json({ msg: 'Recorrido no confirmado' });
    }

    // 2️⃣ Propiedad
    const propiedad = await Propiedad.findById(recorrido.propiedadId)
      .populate('agente', 'correo nombre direccion');

    if (!propiedad || !propiedad.agente) {
      return res.status(404).json({ msg: 'Propiedad no encontrada' });
    }

    const emailAgentePropiedad = propiedad.agente.correo.toLowerCase();

    // 🔐 Solo agente dueño de la propiedad
    if (emailAgentePropiedad !== userEmail) {
      return res.status(403).json({ msg: 'No autorizado' });
    }

    // 3️⃣ Evitar duplicado
    const yaExiste = await Cita.findOne({ recorridoId });
    if (yaExiste) {
      return res.status(409).json({ msg: 'La cita ya fue creada' });
    }

    // 4️⃣ Seguimiento
    const seguimiento = await Seguimiento.findById(recorrido.seguimientoId);
    if (!seguimiento) {
      return res.status(404).json({ msg: 'Seguimiento no encontrado' });
    }

    // 🔥 Fecha real de la cita
    const fechaCita = new Date(`${fecha}T${hora}:00`);

    // ====================================================
    // 📍 DIRECCIÓN FINAL (BLINDADA)
    // ====================================================
    let direccionFinal = recorrido.direccion;

    // Fallback a propiedad si viene vacía
    if (!direccionFinal || direccionFinal.trim() === '') {
      if (propiedad.direccion) {
        direccionFinal = [
          propiedad.direccion.calle,
          propiedad.direccion.colonia,
          propiedad.direccion.municipio,
          propiedad.direccion.estado
        ]
          .filter(Boolean)
          .join(', ');
      }
    }

    // 🚨 Si aún no hay dirección, no creamos la cita
    if (!direccionFinal || direccionFinal.trim() === '') {
      return res.status(400).json({
        msg: 'No se puede crear la cita: la propiedad no tiene dirección válida'
      });
    }

    // 5️⃣ Crear cita
    const cita = await Cita.create({
      recorridoId,
      seguimientoId: seguimiento._id,
      propiedadId: propiedad._id,

      agenteEmail: emailAgentePropiedad,
      agenteNombre: propiedad.agente.nombre,

      clienteEmail: recorrido.clienteEmail,
      clienteNombre: recorrido.nombreCliente,

      propiedadClave: propiedad.clave,
      propiedadDireccion: direccionFinal, // ✅ SIEMPRE llena
      tipoOperacion: seguimiento.tipoOperacion,
      tipoCliente: seguimiento.tipoCliente,

      fecha: fechaCita,
      hora
    });

    // 6️⃣ Actualizar recorrido
    recorrido.fechaCita = fechaCita;
    await recorrido.save();


    // 7️⃣ Actualizar seguimiento
    seguimiento.fechaCita = fechaCita;
    seguimiento.estatus = 'Cita programada';
    await seguimiento.save();

    // 8️⃣ Notificaciones
    await Promise.all([
      Notificacion.create({
        usuarioEmail: seguimiento.agenteEmail,
        tipo: 'seguimiento',
        mensaje: `Cita programada para ${propiedad.clave}`,
        referenciaId: cita._id
      }),
      Notificacion.create({
        usuarioEmail: seguimiento.clienteEmail,
        tipo: 'seguimiento',
        mensaje: `Tu cita para ${propiedad.clave} fue agendada`,
        referenciaId: cita._id
      })
    ]);

    res.json({ ok: true, cita });

  } catch (err) {
    console.error('❌ crearCitaDesdeRecorrido', err);
    res.status(500).json({ msg: 'Error al crear cita' });
  }
};


exports.obtenerCitasPorAgente = async (req, res) => {
  try {
    const { agenteEmail } = req.params;

    const citas = await Cita.find({ agenteEmail })
      .populate("propiedadId", "clave imagenes")  // ✅ Trae imagen y clave
      .lean();

    const citasFormateadas = citas.map(c => ({
      ...c,
      propiedadClave: c.propiedadId?.clave || c.propiedadClave || "",
      propiedadImagen: c.propiedadId?.imagenes?.[0] || "", 
    }));

    res.json(citasFormateadas);
  } catch (err) {
    console.error("Error obtener citas:", err);
    res.status(500).json({ msg: "Error obteniendo citas" });
  }
};
exports.obtenerCitasInmobiliaria = async (req, res) => {
  try {
    const inmobiliariaId = req.params.id;

    // 🔹 Obtener todos los agentes vinculados con esa inmobiliaria
    const agentes = await User.find({ inmobiliaria: inmobiliariaId })
      .select("correo nombre fotoPerfil");

    if (agentes.length === 0) {
      return res.json([]);
    }

    const agentesEmails = agentes.map(a => a.correo);

    // 🔹 Obtener todas las citas de esos agentes
    const citas = await Cita.find({
      agenteEmail: { $in: agentesEmails }
    })
      .populate("propiedadId", "clave imagenes")
      .sort({ fecha: 1 });

    // 🔹 Formateamos la respuesta para tu tabla
    const respuesta = citas.map(c => {
      const agente = agentes.find(a => a.correo === c.agenteEmail);

      return {
        nombreAgente: agente?.nombre || "",
        fotoAgente: agente?.fotoPerfil || "",
        idPropiedad: c.propiedadId?.clave || c.propiedadClave || "",
        imgPropiedad: c.propiedadId?.imagenes?.[0] || "",
        tipoOperacion: c.tipoOperacion,
        tipoCliente: c.tipoCliente,
        tipoEvento: c.tipoEvento,
        fecha: c.fecha,
        hora: c.hora,
        totalCitas: 1
      };
    });

    res.json(respuesta);

  } catch (err) {
    console.error("Error obtener citas inmobiliaria:", err);
    res.status(500).json({ msg: "Error interno" });
  }
};
exports.crearCitaConValidacion = async (req, res) => {
  try {
    const {
      seguimientoId,
      propiedadId,
      agenteEmail,
      clienteEmail,
      clienteNombre,
      tipoOperacion,
      propiedadClave,
      fecha,
      hora,
      tipoEvento,
    } = req.body;

    const user = req.user;

    if (!seguimientoId || !propiedadId || !fecha || !hora) {
      return res.status(400).json({ msg: 'Datos incompletos' });
    }

    const seguimiento = await Seguimiento.findById(seguimientoId);
    if (!seguimiento) {
      return res.status(404).json({ msg: 'Seguimiento no encontrado' });
    }

    if (agenteEmail !== seguimiento.agenteEmail) {
      const colab = await Colaboracion.findOne({
        propiedad: propiedadId,
        agenteEmail: seguimiento.agenteEmail,
        estado: 'aceptada',
      });

      if (!colab) {
        return res.status(403).json({
          msg: 'No existe colaboración aceptada para esta propiedad',
        });
      }
    }

    const fechaReal = new Date(fecha);

    const cita = await Cita.create({
      seguimientoId,
      propiedadId,
      agenteEmail,
      agenteNombre: user.nombre,
      clienteEmail,
      clienteNombre,
      tipoOperacion,
      propiedadClave,
      tipoEvento: tipoEvento || 'Recorrido',
      fecha: fechaReal,
      hora,
      estado: 'pendiente',
    });

    await Seguimiento.findByIdAndUpdate(seguimientoId, {
      fechaCita: fechaReal,
      estatus: 'Cita programada',
    });

    // 🔔 Notificaciones
    await Notificacion.create({
      usuarioEmail: agenteEmail,
      mensaje: `Nueva cita solicitada para la propiedad ${propiedadClave}`,
      tipo: 'contacto',
      referenciaId: cita._id,
    });

    await Notificacion.create({
      usuarioEmail: seguimiento.agenteEmail,
      mensaje: `Cita creada con el cliente ${clienteNombre}`,
      tipo: 'contacto',
      referenciaId: cita._id,
    });

    res.json({ ok: true, cita });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al crear cita' });
  }
};

exports.confirmarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = (req.user.email || req.user.correo).toLowerCase();

    const cita = await Cita.findById(id);
    if (!cita) return res.status(404).json({ msg: 'Cita no encontrada' });

    if (cita.agenteEmail !== userEmail) {
      return res.status(403).json({ msg: 'No autorizado' });
    }

    cita.estado = 'confirmada';
    await cita.save();

    await Notificacion.create({
      usuarioEmail: cita.clienteEmail,
      tipo: 'seguimiento',
      mensaje: `Tu cita para ${cita.propiedadClave} fue confirmada`,
      referenciaId: cita._id
    });

    res.json({ ok: true, cita });
  } catch (err) {
    console.error('❌ confirmarCita', err);
    res.status(500).json({ msg: 'Error al confirmar cita' });
  }
};


exports.obtenerHorasDisponibles = async (req, res) => {
  try {
    const { agenteEmail, fecha } = req.query;

    if (!agenteEmail || !fecha) {
      return res.status(400).json({ msg: 'Faltan datos' });
    }

    const agente = await User.findOne({
      $or: [{ email: agenteEmail }, { correo: agenteEmail }],
    });

    if (!agente) {
      return res.status(404).json({ msg: 'Agente no encontrado' });
    }

    const dia = obtenerDiaSemana(fecha);

    const bloqueDia = agente.disponibilidad.find(d => d.dia === dia);
    if (!bloqueDia) return res.json([]);

    // 🔒 Citas ya ocupadas ese día
    const inicio = new Date(fecha);
    inicio.setHours(0,0,0,0);
    const fin = new Date(fecha);
    fin.setHours(23,59,59,999);

    const citas = await Cita.find({
      agenteEmail,
      fecha: { $gte: inicio, $lte: fin },
      estado: { $ne: 'cancelada' }
    });

    const horasOcupadas = citas.map(c => c.hora);

    // ✅ Horas realmente disponibles
    const disponibles = bloqueDia.horas.filter(
      h => !horasOcupadas.includes(h)
    );

    res.json(disponibles);
  } catch (err) {
    console.error('❌ obtenerHorasDisponibles', err);
    res.status(500).json({ msg: 'Error al obtener horarios' });
  }
};
exports.crearCitaFirma = async (req, res) => {
  try {
    const {
      seguimientoId,
      propiedadId,
      propiedadClave,
      fecha,
      hora,
      tipoOperacion,
    } = req.body;

    const user = req.user;

    if (!seguimientoId || !propiedadId || !fecha || !hora) {
      return res.status(400).json({ msg: 'Datos incompletos' });
    }

    const seguimiento = await Seguimiento.findById(seguimientoId);
    if (!seguimiento) {
      return res.status(404).json({ msg: 'Seguimiento no encontrado' });
    }

    // 🕒 Crear cita de firma
    const cita = await Cita.create({
      seguimientoId,
      propiedadId,
      agenteEmail: seguimiento.agenteEmail,
      agenteNombre: user.nombre,
      clienteEmail: seguimiento.clienteEmail,
      clienteNombre: seguimiento.clienteNombre,
      tipoOperacion,
      propiedadClave,
      tipoEvento: 'Firma de contrato',
      fecha,
      hora,
      estado: 'confirmada',
    });

    // 🧭 TIMELINE
    if (tipoOperacion === 'RENTA') {
      seguimiento.fechaFirmaArr = fecha;
      seguimiento.estatus = 'Contrato firmado';
      seguimiento.estadoFinal = 'GANADO';
      seguimiento.fechaCierre = new Date();
    } else {
      seguimiento.fechaFirma = fecha;
      seguimiento.estatus = 'Firma programada';
    }

    await seguimiento.save();

    // 🔔 NOTIFICACIONES
    const destinatarios = new Set([
      seguimiento.clienteEmail,
      seguimiento.agenteEmail,
    ]);

    await Promise.all(
      [...destinatarios].map(email =>
        Notificacion.create({
          usuarioEmail: email,
          mensaje: `Se ha programado la firma de contrato de la propiedad ${propiedadClave}`,
          tipo: 'contacto',
          referenciaId: cita._id,
        })
      )
    );

    res.json({ ok: true, cita });
  } catch (err) {
    console.error('❌ crearCitaFirma', err);
    res.status(500).json({ msg: 'Error al crear firma' });
  }
};
exports.crearCitaNotaria = async (req, res) => {
  try {
    const {
      seguimientoId,
      propiedadId,
      propiedadClave,
      fecha,
      hora
    } = req.body;

    const user = req.user;

    if (!seguimientoId || !propiedadId || !fecha || !hora) {
      return res.status(400).json({ msg: 'Datos incompletos' });
    }

    const seguimiento = await Seguimiento.findById(seguimientoId);
    if (!seguimiento) {
      return res.status(404).json({ msg: 'Seguimiento no encontrado' });
    }

    if (seguimiento.tipoOperacion !== 'VENTA') {
      return res.status(400).json({ msg: 'La notaría solo aplica para VENTA' });
    }

    // 🕒 Crear cita de notaría
    const cita = await Cita.create({
      seguimientoId,
      propiedadId,
      agenteEmail: seguimiento.agenteEmail,
      agenteNombre: user.nombre,
      clienteEmail: seguimiento.clienteEmail,
      clienteNombre: seguimiento.clienteNombre,
      tipoOperacion: 'VENTA',
      propiedadClave,
      tipoEvento: 'Firma en Notaría',
      fecha,
      hora,
      estado: 'confirmada',
    });

    // 🧭 Actualizar timeline
    seguimiento.fechaNotaria = fecha;
    seguimiento.estatus = 'Firma en notaría programada';
    await seguimiento.save();

    // 🔔 NOTIFICACIONES
    const destinatarios = [
      seguimiento.clienteEmail,
      seguimiento.agenteEmail,
    ];

    await Promise.all(
      destinatarios.map(email =>
        Notificacion.create({
          usuarioEmail: email,
          mensaje: `Se ha programado la firma en notaría para la propiedad ${propiedadClave}`,
          tipo: 'contacto',
          referenciaId: cita._id,
        })
      )
    );

    res.json({ ok: true, cita });
  } catch (err) {
    console.error('❌ crearCitaNotaria', err);
    res.status(500).json({ msg: 'Error al crear cita de notaría' });
  }
};
exports.compartirUbicacion = async (req, res) => {
  try {
    const { id } = req.params;

    const userEmail =
      (req.user?.email || req.user?.correo || '').toLowerCase();

    const cita = await Cita.findById(id);

    if (!cita) {
      return res.status(404).json({ msg: 'Cita no encontrada' });
    }

    // 🔐 Solo el asesor dueño de la propiedad
    if (cita.agenteEmail.toLowerCase() !== userEmail) {
      return res.status(403).json({ msg: 'Sin permiso para esta acción' });
    }

    if (!cita.propiedadDireccion) {
      return res
        .status(400)
        .json({ msg: 'La cita no tiene dirección registrada' });
    }

    // 📍 Google Maps (dirección exacta)
    const urlMaps =
      'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(cita.propiedadDireccion);

    // 📨 Mensaje al cliente
    const mensaje = `
📍 Ubicación de tu cita

🏠 Propiedad: ${cita.propiedadClave}
📅 Fecha: ${new Date(cita.fecha).toLocaleDateString('es-MX')}
⏰ Hora: ${cita.hora}

👉 ${urlMaps}
`;

    // 📩 CORREO
    await enviarUbicacionCita({
      to: cita.clienteEmail,
      clienteNombre: cita.clienteNombre,
      propiedadDireccion: cita.propiedadDireccion,
      urlMaps,
      fecha: cita.fecha,
      hora: cita.hora
    });


    // 🔔 NOTIFICACIÓN INTERNA
    await crearNotificacion({
      usuarioEmail: cita.clienteEmail,
      tipo: 'cita',
      referenciaId: cita._id,
      mensaje: 'Te compartimos la ubicación de tu cita 📍',
      meta: { urlMaps }
    });

    res.json({
      ok: true,
      msg: 'Ubicación enviada correctamente',
      urlMaps
    });

  } catch (err) {
    console.error('❌ Error compartiendo ubicación:', err);
    res.status(500).json({ msg: 'Error al compartir ubicación' });
  }
};
