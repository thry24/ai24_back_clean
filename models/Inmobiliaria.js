const mongoose = require('mongoose');

const InmobiliariaSchema = new mongoose.Schema({
  nombre: String,
  direccion: String,
  telefono: String,
  correo: String,
  status: { type: String, default: 'Active' },
    tipoPlan: { type: String, enum: ["gratis", "mensual", "anual"], default: "gratis" },
    planActivo: { type: Boolean, default: false },
    planExpira: { type: Date, default: null },

}, { timestamps: true });

module.exports = mongoose.model('Inmobiliaria', InmobiliariaSchema);
