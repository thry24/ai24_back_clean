const Recorrido = require('../models/Recorrido');
const Seguimiento = require('../models/Seguimiento');
const Propiedad = require('../models/Propiedad');
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
    const email = (req.params.email || '').toLowerCase();

    if (!email) {
      return res.status(400).json({ ok: false, message: 'Falta el email del agente' });
    }

    const recorridos = await Recorrido.find({ agenteEmail: email })
      .populate('propiedadId', 'clave tipoPropiedad direccion')
      .populate('seguimientoId', 'clienteNombre clienteEmail tipoOperacion estatus')
      .sort({ fecha: -1 });

    res.json(recorridos);
  } catch (err) {
    console.error('❌ Error al obtener recorridos:', err);
    res.status(500).json({
      ok: false,
      message: 'Error al obtener recorridos',
    });
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

if (!propiedad) continue;

const agentePropiedadEmail = (
  propiedad.agente?.correo ||
  propiedad.agente?.email ||
  propiedad.agenteEmail ||
  ''
).toLowerCase();

if (!agentePropiedadEmail) {
  console.error('❌ Propiedad sin email de agente:', propiedadId);
  continue;
}


      // ✅ CREAR RECORRIDO
      const recorrido = await Recorrido.create({
        seguimientoId,
        propiedadId,
        clienteEmail: seguimiento.clienteEmail,
        nombreCliente: seguimiento.clienteNombre,
        agenteEmail: agentePropiedadEmail,
        clavePropiedad: propiedad.clave,
        direccion: propiedad.direccion
          ? `${propiedad.direccion.colonia}, ${propiedad.direccion.municipio}, ${propiedad.direccion.estado}`
          : '',
        imagen: propiedad.imagenPrincipal,
        confirmado: false,
        elegida: false
      });

      // 🔔 NOTIFICACIÓN INTERNA
      await crearNotificacion({
        usuarioEmail: agentePropiedadEmail,
        tipo: 'seguimiento',
        referenciaId: recorrido._id,
        mensaje: `Tienes una solicitud de recorrido para la propiedad ${propiedad.clave}`
      });

      console.log('🔔 Notificación creada para:', agentePropiedadEmail);

      // 📩 CORREO (solo si no es el agente del seguimiento)
      if (agentePropiedadEmail !== agenteSeguimientoEmail) {
        await enviarSolicitudRecorrido({
          to: agentePropiedadEmail,
          agenteNombre: propiedad.agente.nombre || 'Asesor',
          clienteNombre: seguimiento.clienteNombre || 'Cliente',
          propiedadClave: propiedad.clave,
          imagenPropiedad: propiedad.imagenPrincipal
        });

        console.log('📩 Correo enviado a:', agentePropiedadEmail);
      }

      // 🔔 NOTIFICACIÓN AL CLIENTE
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
    const { nota } = req.body;
    const userEmail = req.user.email || req.user.correo;

    const recorrido = await Recorrido.findById(recorridoId);
    if (!recorrido) {
      return res.status(404).json({ msg: 'Recorrido no encontrado' });
    }

    if (recorrido.confirmado) {
      return res.status(400).json({ msg: 'El recorrido ya está confirmado' });
    }

    if (userEmail !== recorrido.agenteEmail) {
      return res.status(403).json({ msg: 'No tienes permiso para confirmar este recorrido' });
    }

    recorrido.confirmado = true;
    recorrido.nota = nota || recorrido.nota;
    await recorrido.save();

    const seguimiento = await Seguimiento.findById(recorrido.seguimientoId);

    if (seguimiento && !seguimiento.fechaRecorrido) {
      seguimiento.fechaRecorrido = new Date();
      seguimiento.estatus = 'Recorrido confirmado';
      await seguimiento.save();
    }

    // 🔔 Cliente
    await crearNotificacion({
      usuarioEmail: recorrido.clienteEmail,
      tipo: 'seguimiento',
      referenciaId: recorrido._id,
      mensaje: `Tu recorrido para la propiedad ${recorrido.clavePropiedad} fue confirmado`
    });

    // 🔔 Agente del seguimiento
    if (seguimiento && seguimiento.agenteEmail !== recorrido.agenteEmail) {
      await crearNotificacion({
        usuarioEmail: seguimiento.agenteEmail,
        tipo: 'seguimiento',
        referenciaId: recorrido._id,
        mensaje: `El recorrido de ${recorrido.clavePropiedad} fue confirmado`
      });
    }

    // 📩 Correo cliente
    await enviarRecorridoConfirmadoCliente({
      to: recorrido.clienteEmail,
      clienteNombre: seguimiento?.clienteNombre || 'Cliente',
      propiedadClave: recorrido.clavePropiedad
    });

    res.json({ ok: true, msg: 'Recorrido confirmado correctamente' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error confirmando recorrido' });
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
      .populate('propiedadId')
      .sort({ createdAt: -1 });

    res.json(recorridos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error obteniendo recorridos' });
  }
};
