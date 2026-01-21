const InvestigacionRenta = require('../models/InvestigacionRenta');
const Seguimiento = require('../models/Seguimiento');
const Notificacion = require('../models/Notificacion');

exports.iniciarInvestigacion = async (req, res) => {
  try {
    const { seguimientoId, tipo, proveedor } = req.body;

    const seguimiento = await Seguimiento.findById(seguimientoId);
    if (!seguimiento) {
      return res.status(404).json({ msg: 'Seguimiento no encontrado' });
    }

    if (seguimiento.tipoOperacion !== 'RENTA') {
      return res.status(400).json({ msg: 'Solo aplica para renta' });
    }

    const investigacion = await InvestigacionRenta.findOneAndUpdate(
      { seguimientoId },
      {
        seguimientoId,
        clienteEmail: seguimiento.clienteEmail,
        agenteEmail: seguimiento.agenteEmail,
        tipo,
        proveedor,
        resultado: 'PENDIENTE',
      },
      { upsert: true, new: true }
    );

    // 🧭 Timeline
    seguimiento.estatus = 'Investigación en proceso';
    seguimiento.fechaInvestigacionInquilinoAval = new Date();
    await seguimiento.save();

    // 🔔 Notificación cliente
    await Notificacion.create({
      usuarioEmail: seguimiento.clienteEmail,
      mensaje: 'Tu documentación está siendo revisada para la renta',
      tipo: 'contacto',
      referenciaId: seguimiento._id,
    });

    res.json({ ok: true, investigacion });
  } catch (err) {
    console.error('❌ iniciarInvestigacion', err);
    res.status(500).json({ msg: 'Error iniciando investigación' });
  }
};
exports.obtenerInvestigacion = async (req, res) => {
  try {
    const { seguimientoId } = req.params;

    const investigacion = await InvestigacionRenta.findOne({ seguimientoId });

    res.json(investigacion);
  } catch (err) {
    console.error('❌ obtenerInvestigacion', err);
    res.status(500).json({ msg: 'Error obteniendo investigación' });
  }
};
