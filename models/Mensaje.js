// models/Mensaje.js
const mongoose = require('mongoose');

const MensajeSchema = new mongoose.Schema(
  {
    emisorEmail:   { type: String, required: true, index: true },
    receptorEmail: { type: String, required: true, index: true },
    participantsHash: { type: String, index: true },

    mensaje:      { type: String, default: '' }, 
    archivoUrl:   { type: String },
    tipoDocumento:{ type: String }, 
    nombreCliente:{ type: String },

    leido:        { type: Boolean, default: false },
    fecha:        { type: Date, default: Date.now },

    propiedadId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Propiedad' },
    propiedadClave: { type: String },

    // 🔥 NUEVO: SNAPSHOT PARA VISTA PREVIA
    propiedadSnapshot: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Propiedad',
      },
      clave: String,
      imagen: String,
      precio: Number,
      tipoOperacion: String,
      ubicacion: String,
    },
  },
  { timestamps: true }
);

MensajeSchema.pre('save', function (next) {
  const a = (this.emisorEmail || '').toLowerCase();
  const b = (this.receptorEmail || '').toLowerCase();
  this.participantsHash = [a, b].sort().join('#');
  if (!this.fecha) this.fecha = new Date();
  next();
});

module.exports = mongoose.model('Mensaje', MensajeSchema);
