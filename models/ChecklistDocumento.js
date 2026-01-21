const mongoose = require('mongoose');

const DocumentoSchema = new mongoose.Schema({
  nombre: String,
  obligatorio: Boolean,
  archivoUrl: String,
  subido: { type: Boolean, default: false },
  fechaSubida: Date
});

const ChecklistDocumentoSchema = new mongoose.Schema({
  seguimientoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seguimiento',
    required: true
  },

  tipoOperacion: {
    type: String,
    enum: ['VENTA', 'RENTA'],
    required: true
  },

  rol: {
    type: String,
    enum: ['PROPIETARIO', 'COMPRADOR', 'INQUILINO'],
    required: true
  },
  tokenAcceso: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  emailUsuario: String,

  documentos: [DocumentoSchema],

  completo: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

module.exports = mongoose.model('ChecklistDocumento', ChecklistDocumentoSchema);
