const mongoose = require('mongoose');

const NotificacionSchema = new mongoose.Schema(
  {
    usuarioEmail: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },

    mensaje: {
      type: String,
      required: true,
    },

    tipo: {
      type: String,
      enum: ['contacto', 'mensaje', 'sistema', 'colaboracion', 'seguimiento'],
      default: 'contacto',
    },

    referenciaId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    leido: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notificacion', NotificacionSchema);
