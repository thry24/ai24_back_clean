const Cita = require('../models/Cita');
const Seguimiento = require('../models/Seguimiento');
const User = require("../models/User"); 
const Propiedad = require("../models/Propiedad"); 
const Colaboracion = require('../models/Colaboracion');
const Notificacion = require('../models/Notificacion');
const { obtenerDiaSemana } = require('../utils/fechas');
const { enviarCitaAgendada } = require('../utils/enviarCitaAgendada');

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
      return res.status(400).json({ msg: 'Faltan agenteEmail o fecha' });
    }

    // agenda base 09:00 - 18:00 cada hora
    const base = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];

    // citas del día para ese agente
    const start = new Date(`${fecha}T00:00:00.000Z`);
    const end   = new Date(`${fecha}T23:59:59.999Z`);

    const ocupadas = await Cita.find({
      agenteEmail,
      fecha: { $gte: start, $lte: end }
    }).select('hora -_id');

    const horasOcupadas = new Set(ocupadas.map(c => c.hora));
    const libres = base.filter(h => !horasOcupadas.has(h));

    return res.json({ horas: libres });
  } catch (e) {
    console.error('getHorasDisponibles error:', e);
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
    const user = req.user;

    const cita = await Cita.findById(id);
    if (!cita) return res.status(404).json({ msg: 'Cita no encontrada' });

    if (cita.agenteEmail !== user.email && cita.agenteEmail !== user.correo) {
      return res.status(403).json({ msg: 'No autorizado' });
    }

    cita.estado = 'confirmada';
    await cita.save();

    await Seguimiento.findByIdAndUpdate(cita.seguimientoId, {
      fechaRecorrido: cita.fecha,
      estatus: 'Recorrido programado',
    });

    await Notificacion.create({
      usuarioEmail: cita.clienteEmail,
      mensaje: `Tu cita para la propiedad ${cita.propiedadClave} ha sido confirmada`,
      tipo: 'contacto',
      referenciaId: cita._id,
    });

    res.json({ ok: true, cita });
  } catch (err) {
    console.error(err);
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
