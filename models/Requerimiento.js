const mongoose = require('mongoose');

const RequerimientoSchema = new mongoose.Schema({
  tipoPropiedad: String,
  tipoOperacion: String,
  formaPago: String,
  juridico: Boolean,
  aval: Boolean,
  mascotas: Boolean,
  caracteristicas: String,
  zonas: [String],
  presupuesto: Number,
  notaAdicional: String,
  fechaOperacion: Date,
  ciudad: String,

  // 🧑‍💼 Quién lo creó
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  rolCreador: {
    type: String,
    enum: ['agente', 'inmobiliaria'],
    required: true
  },

  // 🏢 SIEMPRE OBLIGATORIA
  inmobiliaria: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // 👤 Puede existir o no
  agenteAsignado: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  creadoEn: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Requerimiento', RequerimientoSchema);
