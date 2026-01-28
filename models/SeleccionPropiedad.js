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
      enum: [
        'INTERESADA',          // cliente marcó
        'SUGERIDA',            // agente sugirió
        'PENDIENTE_RECORRIDO', // 🔔 esperando aprobación del dueño
        'APROBADA_RECORRIDO',  // 🚗 entra a recorridos
        'CONFIRMADA',          // 🏁 elección final
        'DESCARTADA'
      ],
      default: 'INTERESADA'
    }
  },
  { timestamps: true }
);

// 🔒 Evita duplicados por seguimiento + propiedad
seleccionSchema.index(
  { seguimiento: 1, propiedad: 1 },
  { unique: true }
);

module.exports = mongoose.model('SeleccionPropiedad', seleccionSchema);
