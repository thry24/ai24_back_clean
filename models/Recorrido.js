const mongoose = require('mongoose');

const RecorridoSchema = new mongoose.Schema({
  fecha: {
    type: Date,
    default: null
  },
  tipo: { type: String },
  asesor: { type: String },
  direccion: { type: String },
  comision: { type: Number, default: 0 },
  confirmado: { type: Boolean, default: false },
  nota: { type: String },
  elegida: { type: Boolean, default: false },
  imagen: { type: String },
  // 🔗 Asociaciones
  seguimientoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seguimiento' },
  propiedadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Propiedad' },
  clienteEmail: String,
  clavePropiedad: String, // ✅ NUEVO campo
  nombreCliente: String, 
  agenteEmail: String
}, { timestamps: true });

module.exports = mongoose.model('Recorrido', RecorridoSchema);
