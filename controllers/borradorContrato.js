const BorradorContrato = require('../models/BorradorContrato');
const Seguimiento = require('../models/Seguimiento');
const Propiedad = require('../models/Propiedad');
const Colaboracion = require('../models/Colaboracion');
const Notificacion = require('../models/Notificacion');
const MensajeAgente = require('../models/MensajesAgente');

exports.enviarBorradorContrato = async (req, res) => {
  try {
    const {
      seguimientoId,
      propiedadId,
      archivoUrl,
      observaciones,
    } = req.body;

    const user = req.user;

    if (!seguimientoId || !propiedadId || !archivoUrl) {
      return res.status(400).json({ msg: 'Datos incompletos' });
    }

    const seguimiento = await Seguimiento.findById(seguimientoId);
    if (!seguimiento) {
      return res.status(404).json({ msg: 'Seguimiento no encontrado' });
    }

    const propiedad = await Propiedad.findById(propiedadId);
    if (!propiedad) {
      return res.status(404).json({ msg: 'Propiedad no encontrada' });
    }

    // 📄 Guardar borrador
    const borrador = await BorradorContrato.create({
      seguimientoId,
      propiedadId,
      tipoOperacion: seguimiento.tipoOperacion,
      archivoUrl,
      observaciones,
    });

    // 🧭 TIMELINE
    if (seguimiento.tipoOperacion === 'RENTA') {
      seguimiento.fechaEnvioBorradorArr = new Date();
      seguimiento.estatus = 'Borrador de contrato enviado';
    } else {
      seguimiento.fechaBorrador = new Date();
      seguimiento.estatus = 'Borrador enviado a notaría';
    }

    await seguimiento.save();

    // 🔔 NOTIFICACIONES
    const destinatarios = new Set([
      seguimiento.clienteEmail,
      seguimiento.agenteEmail,
    ]);

    // Propietario (si existe)
    if (propiedad.datosPropietario?.correo) {
      destinatarios.add(propiedad.datosPropietario.correo);
    }

    // Agentes en colaboración
    const colaboraciones = await Colaboracion.find({
      propiedad: propiedadId,
      estado: 'aceptada',
    });

    colaboraciones.forEach(c => {
      if (c.colaboradorEmail) destinatarios.add(c.colaboradorEmail);
    });

    for (const email of destinatarios) {
      await Notificacion.create({
        usuarioEmail: email,
        mensaje: `Se envió un borrador de contrato para la propiedad ${propiedad.clave}`,
        tipo: 'contacto',
        referenciaId: borrador._id,
      });
    }

    // 💬 MENSAJE EN MENSAJES-AGENTES (trazabilidad)
    await MensajeAgente.create({
      nombreAgente: user.nombre,
      emailAgente: user.email || user.correo,
      nombreCliente: seguimiento.clienteNombre,
      emailCliente: seguimiento.clienteEmail,
      texto: `Te comparto el borrador de contrato de la propiedad ${propiedad.clave}`,
      idPropiedad: propiedad._id,
      imagenPropiedad: propiedad.imagenPrincipal,
      tipoOperacion: seguimiento.tipoOperacion,
      ubicacion: `${propiedad.direccion?.municipio}, ${propiedad.direccion?.estado}`,
      remitenteId: user._id,
    });

    res.json({ ok: true, borrador });

  } catch (err) {
    console.error('❌ enviarBorradorContrato', err);
    res.status(500).json({ msg: 'Error al enviar borrador' });
  }
};
