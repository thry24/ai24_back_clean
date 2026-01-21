const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
  // 🔗 Relación
  propiedadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Propiedad' },
  agenteEmail: String,

  // 👤 Datos del contacto (snapshot)
  nombre: String,
  email: { type: String, required: true },
  telefono: String,
  rol: String,           // cliente / propietario / inmobiliaria
  tipoCliente: String,   // igual al rol
  mensaje: String,

  // 🧭 Contexto
  tipoOperacion: String,
  ubicacion: String,
  origen: {
    type: String,
    enum: ['propiedad', 'mensajes', 'mensajes-agentes'],
    default: 'propiedad'
  },

  // 🔄 Estado del lead
  estatus: {
    type: String,
    enum: ['nuevo', 'contactado', 'cita', 'cerrado'],
    default: 'nuevo'
  },

}, { timestamps: true });

module.exports = mongoose.model('Lead', LeadSchema);
