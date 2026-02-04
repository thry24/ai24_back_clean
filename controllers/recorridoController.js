const Recorrido = require('../models/Recorrido');
const Seguimiento = require('../models/Seguimiento');
const Propiedad = require('../models/Propiedad');
const Colaboracion = require('../models/Colaboracion');
const User = require('../models/User');
const Notificacion = require('../models/Notificacion');
const { crearNotificacion } = require('../utils/notificaciones');
const {
  enviarSolicitudRecorrido,
  enviarRecorridoConfirmadoCliente
} = require('../utils/mailer');

/* =========================
   📌 CREAR NUEVO RECORRIDO
========================= */
exports.crear = async (req, res) => {
  try {
    const nuevo = new Recorrido(req.body);
    await nuevo.save();

    const { seguimientoId, fecha } = req.body;

    if (seguimientoId && fecha) {
      await Seguimiento.findByIdAndUpdate(
        seguimientoId,
        {
          fechaRecorrido: fecha,
          estatus: 'Recorrido agendado'
        }
      );
    }

    res.json({ ok: true, recorrido: nuevo });

  } catch (err) {
    console.error('❌ Error al crear recorrido:', err);
    res.status(500).json({
      ok: false,
      message: 'Error al guardar el recorrido',
    });
  }
};


/* =========================
   📌 OBTENER RECORRIDOS POR AGENTE
========================= */
exports.obtenerPorAgente = async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();

    const recorridos = await Recorrido.find({
      $or: [
        { agenteEmail: email }, // dueño de la propiedad
        { clienteEmail: { $exists: true } } // luego filtramos por seguimiento
      ]
    })
      .populate('seguimientoId', 'agenteEmail clienteNombre')
      .populate('propiedadId', 'clave imagenPrincipal')
      .lean();

    // 🔥 Filtrar los que realmente le corresponden
    const visibles = recorridos.filter(r =>
      r.agenteEmail === email ||
      r.seguimientoId?.agenteEmail?.toLowerCase() === email
    );

    res.json(visibles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error obteniendo recorridos' });
  }
};


/* =========================
   📌 ELIMINAR RECORRIDO
========================= */
exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    await Recorrido.findByIdAndDelete(id);

    res.json({ ok: true, message: 'Recorrido eliminado correctamente' });
  } catch (err) {
    console.error('❌ Error al eliminar recorrido:', err);
    res.status(500).json({ ok: false, message: 'Error al eliminar recorrido' });
  }
};

/* =========================
   📌 EDITAR RECORRIDO
========================= */
exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const recorrido = await Recorrido.findByIdAndUpdate(id, req.body, { new: true });

    res.json({ ok: true, recorrido });
  } catch (err) {
    console.error('❌ Error al actualizar recorrido:', err);
    res.status(500).json({ ok: false, message: 'Error al actualizar recorrido' });
  }
};

exports.solicitarRecorridos = async (req, res) => {
  try {
    const { seguimientoId, propiedades } = req.body;
    const userEmail = (req.user.email || req.user.correo || '').toLowerCase();

    if (!seguimientoId || !Array.isArray(propiedades)) {
      return res.status(400).json({ msg: 'Datos incompletos' });
    }

    const seguimiento = await Seguimiento.findById(seguimientoId);
    if (!seguimiento) {
      return res.status(404).json({ msg: 'Seguimiento no encontrado' });
    }

    const clienteEmail = seguimiento.clienteEmail.toLowerCase();
    const agenteSeguimientoEmail = seguimiento.agenteEmail.toLowerCase();

    if (userEmail !== clienteEmail && userEmail !== agenteSeguimientoEmail) {
      return res.status(403).json({ msg: 'Sin permiso' });
    }

    let creados = 0;

    for (const propiedadId of propiedades) {
      const yaExiste = await Recorrido.findOne({ seguimientoId, propiedadId });
      if (yaExiste) continue;

      const propiedad = await Propiedad
        .findById(propiedadId)
        .populate('agente', 'correo email nombre');

      if (!propiedad || !propiedad.agente) continue;

      const agentePropiedadEmail =
        (propiedad.agente.correo || propiedad.agente.email || '').toLowerCase();

      if (!agentePropiedadEmail) continue;

      const tipoOperacion = seguimiento.tipoOperacion.toLowerCase();

      let porcentajeComision = 0;

      if (propiedad.comision?.comparte) {
        if (tipoOperacion === 'venta') {
          porcentajeComision =
            propiedad.comision.venta ??
            propiedad.comision.porcentaje ??
            0;
        } else if (tipoOperacion === 'renta') {
          porcentajeComision =
            propiedad.comision.renta ??
            propiedad.comision.porcentaje ??
            0;
        }
      }

      const recorrido = await Recorrido.create({
        seguimientoId,
        propiedadId,

        clienteEmail: seguimiento.clienteEmail,
        nombreCliente: seguimiento.clienteNombre,

        agentePropiedadEmail,
        agenteSeguimientoEmail,
        asesor: propiedad.agente.nombre,

        clavePropiedad: propiedad.clave,
        tipo: propiedad.tipoPropiedad,
        tipoOperacion,

        direccion: [
          propiedad.direccion?.calle,
          propiedad.direccion?.colonia,
          propiedad.direccion?.municipio,
          propiedad.direccion?.estado
        ].filter(Boolean).join(', '),

        imagen: propiedad.imagenPrincipal,

        comparteComision: propiedad.comision?.comparte || false,
        comision: porcentajeComision,

        confirmado: false,
        elegida: false
      });


      // 🔔 Notificación al agente de la propiedad
      await crearNotificacion({
        usuarioEmail: agentePropiedadEmail,
        tipo: 'recorrido',
        referenciaId: recorrido._id,
        mensaje: `Solicitud de recorrido para ${propiedad.clave}`,
        meta: { accion: 'confirmar_recorrido' }
      });

      // 📩 Correo (si no es el agente del seguimiento)
      if (agentePropiedadEmail !== agenteSeguimientoEmail) {
        await enviarSolicitudRecorrido({
          to: agentePropiedadEmail,
          agenteNombre: propiedad.agente.nombre || 'Asesor',
          clienteNombre: seguimiento.clienteNombre || 'Cliente',
          propiedadClave: propiedad.clave,
          imagenPropiedad: propiedad.imagenPrincipal
        });
      }

      // 🔔 Notificación al cliente
      await crearNotificacion({
        usuarioEmail: clienteEmail,
        tipo: 'seguimiento',
        referenciaId: recorrido._id,
        mensaje: `Tu solicitud de recorrido para ${propiedad.clave} está pendiente de confirmación`
      });

      creados++;
    }

    if (!seguimiento.fechaRecorrido) {
      seguimiento.fechaRecorrido = new Date();
      seguimiento.estatus = 'Recorrido solicitado';
      await seguimiento.save();
    }

    res.json({ ok: true, recorridosCreados: creados });

  } catch (err) {
    console.error('❌ Error solicitando recorridos:', err);
    res.status(500).json({ msg: 'Error solicitando recorridos' });
  }
};


exports.confirmarRecorrido = async (req, res) => {
  try {
    const { recorridoId } = req.params;
    const userEmail = (req.user.correo || req.user.email || '').toLowerCase();

    // 1️⃣ Recorrido
    const recorrido = await Recorrido.findById(recorridoId);
    if (!recorrido) {
      return res.status(404).json({ msg: 'Recorrido no encontrado' });
    }

    // 2️⃣ Propiedad
    const propiedad = await Propiedad
      .findById(recorrido.propiedadId)
      .populate('agente', 'nombre correo email');

    if (!propiedad || !propiedad.agente) {
      return res.status(400).json({ msg: 'Propiedad sin agente asignado' });
    }

    const emailAgentePropiedad =
      (propiedad.agente.correo || propiedad.agente.email || '').toLowerCase();

    // 🔐 Solo el dueño de la propiedad puede aceptar
    if (emailAgentePropiedad !== userEmail) {
      return res.status(403).json({ msg: 'No tienes permiso para confirmar este recorrido' });
    }

    if (recorrido.confirmado) {
      return res.status(400).json({
        msg: 'Este recorrido ya fue confirmado'
      });
    }

    // 3️⃣ Confirmar recorrido
    recorrido.confirmado = true;
    await recorrido.save();

    await Notificacion.updateMany(
      {
        referenciaId: recorrido._id,
        tipo: 'recorrido_solicitado',
        usuarioEmail: userEmail
      },
      { $set: { leida: true } }
    );

    // 4️⃣ Seguimiento
    const seguimiento = await Seguimiento.findById(recorrido.seguimientoId);
    if (!seguimiento) {
      return res.status(404).json({ msg: 'Seguimiento no encontrado' });
    }

    // 5️⃣ Agente principal (el que trae al cliente)
    const agentePrincipal = await User.findOne({
      correo: seguimiento.agenteEmail.toLowerCase()
    });

    // 6️⃣ CREAR COLABORACIÓN SOLO SI NO ES TU PROPIEDAD
    if (emailAgentePropiedad !== seguimiento.agenteEmail.toLowerCase()) {
      const existe = await Colaboracion.findOne({
        seguimiento: seguimiento._id,
        propiedad: propiedad._id
      });

      if (!existe) {
        await Colaboracion.create({
          agentePrincipal: agentePrincipal._id,
          nombreAgente: agentePrincipal.nombre,
          agenteEmail: agentePrincipal.correo,

          colaborador: propiedad.agente._id,
          nombreColaborador: propiedad.agente.nombre,
          colaboradorEmail: emailAgentePropiedad,

          tipoColaboracion: 'externo',

          propiedad: propiedad._id,
          nombrePropiedad: propiedad.clave,
          imagenPropiedad: propiedad.imagenPrincipal,

          tipoOperacion: seguimiento.tipoOperacion,
          comision: propiedad.comision?.porcentaje || 0,

          seguimientoActivo: true,
          seguimiento: seguimiento._id,

          estado: 'aceptada'
        });
      }
    }

    // 7️⃣ Notificaciones

    // 🔔 Agente principal
    await Notificacion.create({
      usuarioEmail: seguimiento.agenteEmail,
      mensaje: `El recorrido para la propiedad ${propiedad.clave} fue aceptado`,
      tipo: 'seguimiento',
      referenciaId: recorrido._id
    });

    // 🔔 Cliente
    await Notificacion.create({
      usuarioEmail: seguimiento.clienteEmail,
      mensaje: `Tu recorrido para ${propiedad.clave} fue confirmado`,
      tipo: 'seguimiento',
      referenciaId: recorrido._id
    });

    // 🔔 Agente colaborador
    await Notificacion.create({
      usuarioEmail: emailAgentePropiedad,
      mensaje: `Confirmaste un recorrido para la propiedad ${propiedad.clave}`,
      tipo: 'seguimiento',
      referenciaId: recorrido._id
    });

    // 8️⃣ Seguimiento status
    seguimiento.estatus = 'RECORRIDO_CONFIRMADO';
    await seguimiento.save();

    return res.json({
      ok: true,
      message: 'Recorrido confirmado y colaboración creada correctamente'
    });

  } catch (err) {
    console.error('❌ confirmarRecorrido:', err);
    return res.status(500).json({ msg: 'Error al confirmar recorrido' });
  }
};

exports.elegirRecorrido = async (req, res) => {
  try {
    const { recorridoId } = req.params;
    const userEmail = req.user.email || req.user.correo;

    const recorrido = await Recorrido.findById(recorridoId);
    if (!recorrido) {
      return res.status(404).json({ msg: 'Recorrido no encontrado' });
    }

    if (!recorrido.confirmado) {
      return res.status(400).json({ msg: 'El recorrido no está confirmado' });
    }

    if (recorrido.elegida) {
      return res.status(400).json({ msg: 'Este recorrido ya fue elegido' });
    }

    const seguimiento = await Seguimiento.findById(recorrido.seguimientoId);
    if (!seguimiento) {
      return res.status(404).json({ msg: 'Seguimiento no encontrado' });
    }

    if (userEmail !== seguimiento.agenteEmail) {
      return res.status(403).json({ msg: 'No tienes permiso para elegir esta propiedad' });
    }

    // 1️⃣ Elegir recorrido
    recorrido.elegida = true;
    await recorrido.save();

    // 2️⃣ Desmarcar otros
    await Recorrido.updateMany(
      { seguimientoId: seguimiento._id, _id: { $ne: recorrido._id } },
      { $set: { elegida: false } }
    );

    // 3️⃣ Actualizar seguimiento
    seguimiento.propiedadConfirmada = recorrido.propiedadId;
    seguimiento.fechaEleccion = new Date();
    seguimiento.estatus = 'Propiedad elegida';
    await seguimiento.save();

    const esPropiedadPropia =
      recorrido.agenteEmail === seguimiento.agenteEmail;

    if (!esPropiedadPropia) {
      // 🤝 colaboración
      await enviarSolicitudColaboracion({
        to: recorrido.agenteEmail,
        agenteNombre: seguimiento.agenteEmail,
        propiedadClave: recorrido.clavePropiedad,
        imagenPropiedad: recorrido.imagen
      });

      await crearNotificacion({
        usuarioEmail: recorrido.agenteEmail,
        tipo: 'colaboracion',
        referenciaId: seguimiento._id,
        mensaje: `El cliente eligió tu propiedad ${recorrido.clavePropiedad}. ¿Aceptas colaborar?`
      });

      await crearNotificacion({
        usuarioEmail: seguimiento.clienteEmail,
        tipo: 'seguimiento',
        referenciaId: seguimiento._id,
        mensaje: `Se solicitó colaboración para la propiedad ${recorrido.clavePropiedad}`
      });
    }

    res.json({
      ok: true,
      msg: 'Propiedad elegida correctamente',
      colaboracion: !esPropiedadPropia
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error eligiendo propiedad' });
  }
};

exports.obtenerPorSeguimiento = async (req, res) => {
  try {
    const { seguimientoId } = req.params;

    const recorridos = await Recorrido.find({ seguimientoId })
      .populate({
        path: 'propiedadId',
        populate: {
          path: 'agente',
          select: 'nombre correo'
        }
      })
      .sort({ createdAt: -1 });

    const seguimiento = await Seguimiento.findById(seguimientoId);

    const citas = await Cita.find({ seguimientoId });

    const recorridosFinal = recorridos.map(r => {
      const cita = citas.find(c => c.recorridoId.toString() === r._id.toString());

      return {
        _id: r._id,
        confirmado: r.confirmado,
        elegida: r.elegida,
        nota: r.nota,

        nombreCliente: r.nombreCliente,

        // 👇 VIENEN DE PROPIEDAD
        tipo: seguimiento.tipoOperacion,
        comision:
          typeof r.propiedadId?.comision === 'object'
            ? r.propiedadId.comision.porcentaje || 0
            : r.propiedadId?.comision || 0,

        asesor: r.propiedadId?.agente?.nombre || r.propiedadId?.agente?.correo,

        direccion: [
          r.propiedadId?.direccion?.calle,
          r.propiedadId?.direccion?.colonia,
          r.propiedadId?.direccion?.municipio,
          r.propiedadId?.direccion?.estado
        ].filter(Boolean).join(', '),

        clavePropiedad: r.propiedadId?.clave,
        imagen: r.propiedadId?.imagenPrincipal,

        // 👇 CLAVE
        fechaCita: cita?.fecha || null,
        tieneCita: !!cita,

        agenteEmail: r.propiedadId?.agente?.correo,
        seguimientoId
      };
    });

    res.json(recorridosFinal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error obteniendo recorridos' });
  }
};
