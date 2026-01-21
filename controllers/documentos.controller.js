const DocumentoSeguimiento = require('../models/DocumentoSeguimiento');
const Seguimiento = require('../models/Seguimiento');
const Notificacion = require('../models/Notificacion');


async function verificarDocsCompletos(seguimientoId) {
  const checklists = await ChecklistDocumento.find({ seguimientoId });

  const completos = checklists.every(c => c.completo);
  if (!completos) return;

  await Seguimiento.findByIdAndUpdate(seguimientoId, {
    fechaDocsCompletos: new Date(),
    estatus: 'DOCUMENTACION_COMPLETA'
  });
}

exports.subirDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, archivoUrl } = req.body;

    const checklist = await ChecklistDocumento.findById(id);
    if (!checklist) {
      return res.status(404).json({ message: 'Checklist no encontrado' });
    }

    if (!checklist.habilitado) {
      return res.status(403).json({ message: 'Checklist no habilitado' });
    }

    const doc = checklist.documentos.find(d => d.nombre === nombre);
    if (!doc) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }

    doc.subido = true;
    doc.archivoUrl = archivoUrl;
    doc.fechaSubida = new Date();

    checklist.completo = checklist.documentos
      .filter(d => d.obligatorio)
      .every(d => d.subido);

    await checklist.save();

    // 🔥 AQUÍ ES DONDE VA
    await verificarDocsCompletos(checklist.seguimientoId);

    res.json({ ok: true, checklist });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al subir documento' });
  }
};

/* =========================
   VALIDAR DOCUMENTO
========================= */
exports.validarDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const { aprobado, observaciones } = req.body;

    const doc = await DocumentoSeguimiento.findById(id);
    if (!doc) {
      return res.status(404).json({ msg: 'Documento no encontrado' });
    }

    doc.estado = aprobado ? 'VALIDADO' : 'RECHAZADO';
    doc.observaciones = observaciones || '';
    await doc.save();

    await Notificacion.create({
      usuarioEmail: doc.clienteEmail,
      mensaje: aprobado
        ? `Documento validado: ${doc.tipoDocumento}`
        : `Documento rechazado: ${doc.tipoDocumento}`,
      tipo: 'contacto',
      referenciaId: doc._id,
    });

    await exports.verificarDocumentosCompletos(doc.seguimientoId);

    res.json({ ok: true, doc });
  } catch (err) {
    res.status(500).json({ msg: 'Error validando documento' });
  }
};

/* =========================
   VERIFICAR DOCUMENTOS
========================= */
exports.verificarDocumentosCompletos = async (seguimientoId) => {
  const pendientes = await DocumentoSeguimiento.find({
    seguimientoId,
    estado: { $ne: 'VALIDADO' },
  });

  if (pendientes.length === 0) {
    const seguimiento = await Seguimiento.findById(seguimientoId);
    seguimiento.estatus = 'Documentación completa';
    await seguimiento.save();
  }
};

/* =========================
   OBTENER DOCS CLIENTE ✅
========================= */
exports.obtenerDocsCliente = async (req, res) => {
  const { email } = req.params;

  const docs = await DocumentoSeguimiento.find({
    clienteEmail: email,
  });

  res.json(docs);
};
