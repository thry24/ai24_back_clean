const mongoose = require('mongoose');

const DocumentoSchema = new mongoose.Schema({
  nombre: String,
  obligatorio: { type: Boolean, default: true },
  subido: { type: Boolean, default: false },
  archivoUrl: String
});

const ChecklistSchema = new mongoose.Schema({
  seguimientoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seguimiento',
    required: true
  },
  propietarioEmail: String,
  tipoOperacion: String,
  documentos: [DocumentoSchema],
  tokenAcceso: String,
  completo: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Checklist', ChecklistSchema);
