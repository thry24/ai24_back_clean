// models/MensajesAgente.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const mensajeAgenteSchema = new Schema(
  {
    nombreAgente: { type: String, required: true },
    emailAgente: { type: String, default: '' }, // 🟢 NUEVO
    nombreCliente: { type: String, required: true },
    emailCliente: { type: String, default: '' }, // 🟢 NUEVO
    texto: { type: String, required: true },
    idPropiedad: { type: String, default: '' },
    imagenPropiedad: { type: String, default: '' },
    tipoOperacion: { type: String, default: '' },
    ubicacion: { type: String, default: '' },
    email: { type: String, default: '' }, // ⚠️ lo dejamos por compatibilidad
    telefono: { type: String, default: '' },
    estado: { type: String, default: 'sin-atender' },
    asignadoA: { type: String, default: '' },
    fecha: { type: Date, default: Date.now },
    remitenteId: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('MensajeAgente', mensajeAgenteSchema);
