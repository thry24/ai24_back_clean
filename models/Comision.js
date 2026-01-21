// models/Comision.js
const mongoose = require('mongoose');

const ComisionSchema = new mongoose.Schema({
  seguimiento: { type: mongoose.Schema.Types.ObjectId, ref: 'Seguimiento', required: true },
  propiedad:   { type: mongoose.Schema.Types.ObjectId, ref: 'Propiedad', required: true },

  agentePagador: { type: String, required: true }, // email
  agenteReceptor:{ type: String, required: true }, // email

  tipoOperacion: { type: String, enum: ['VENTA','RENTA'], required: true },

  porcentaje: { type: Number, required: true },
  monto: { type: Number, required: true },

  estado: {
    type: String,
    enum: ['PENDIENTE', 'PAGADA', 'VENCIDA'],
    default: 'PENDIENTE'
  },

  fechaGeneracion: { type: Date, default: Date.now },
  fechaPago: { type: Date },

  notas: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Comision', ComisionSchema);
