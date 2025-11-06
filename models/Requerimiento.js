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
  presupuesto: String,
  notaAdicional: String,
  fechaOperacion: Date, // Fecha estimada de cierre
  ciudad: String,

  // 🔑 Identidad del agente
  nombreAgente: String,
  agenteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  creadoEn: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Requerimiento', RequerimientoSchema);
