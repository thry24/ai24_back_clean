const mongoose = require('mongoose');

const seleccionSchema = new mongoose.Schema(
  {
    seguimiento: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seguimiento',
      required: true,
    },

    clienteEmail: {
      type: String,
      required: true,
      lowercase: true,
    },

    agenteEmail: {
      type: String,
      required: true,
      lowercase: true,
    },

    propiedad: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Propiedad',
      required: true,
    },

    origen: {
      type: String,
      enum: ['CLIENTE', 'AGENTE'],
      required: true,
    },

    estado: {
      type: String,
      enum: ['SELECCIONADA', 'DESCARTADA'],
      default: 'SELECCIONADA',
    },
  },
  { timestamps: true }
);

// 🔒 Evita duplicados por seguimiento + propiedad
seleccionSchema.index(
  { seguimiento: 1, propiedad: 1 },
  { unique: true }
);

module.exports = mongoose.model('SeleccionPropiedad', seleccionSchema);
