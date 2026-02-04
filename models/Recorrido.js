const mongoose = require('mongoose');

const RecorridoSchema = new mongoose.Schema(
  {
    // 🗓️ Fechas clave
    fechaRecorrido: {
      type: Date,
      default: null
    },
    fechaCita: {
      type: Date,
      default: null
    },

    // 🔗 Relaciones
    seguimientoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seguimiento',
      required: true
    },
    propiedadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Propiedad',
      required: true
    },

    // 👤 Cliente
    clienteEmail: {
      type: String,
      required: true,
      lowercase: true
    },
    nombreCliente: {
      type: String
    },

    // 👥 Agentes
    agentePropiedadEmail: {
      type: String,
      required: true,
      lowercase: true
    },
    agenteSeguimientoEmail: {
      type: String,
      required: true,
      lowercase: true
    },
    asesorPropiedad: {
      type: String // nombre del agente de la propiedad
    },

    // 🏠 Snapshot de la propiedad
    clavePropiedad: {
      type: String,
      required: true
    },
    tipo: {
      type: String,
      required: true   // casa, departamento, terreno, etc
    },
    tipoOperacion: {
      type: String, // venta | renta
      required: true
    },
    direccion: {
      type: String
    },
    imagen: {
      type: String
    },

    // 💰 Negocio
    comparteComision: {
      type: Boolean,
      default: false
    },
    comision: {
      type: Number,
      default: 0 // porcentaje final congelado
    },

    // 🧭 Estado del flujo
    confirmado: {
      type: Boolean,
      default: false
    },
    elegida: {
      type: Boolean,
      default: false
    },

    // 📝 Extras
    nota: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Recorrido', RecorridoSchema);
