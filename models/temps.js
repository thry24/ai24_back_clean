const mongoose = require('mongoose');

const cartaOfertaSchema = new mongoose.Schema(
  {
    seguimientoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seguimiento',
      required: true,
    },

    propiedadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Propiedad',
      required: true,
    },

    propiedadClave: String,

    montoOferta: {
      type: Number,
      required: true
    },

    // ======================
    // 🔁 TIPO DE OPERACIÓN
    // ======================
    tipoOperacion: {
      type: String,
      enum: ['VENTA', 'RENTA'],
      required: true,
    },

    // ======================
    // 👤 CLIENTE
    // ======================
    clienteNombre: String,
    clienteEmail: String,

    // ======================
    // 👤 PROPIETARIO
    // ======================
    propietarioNombre: String,
    propietarioEmail: String,

    agenteEmail: String,

    // ======================
    // 🏠 DATOS RENTA
    // ======================
    rentaMensual: Number,
    deposito: Number,
    duracionMeses: Number,
    fechaInicio: Date,
    formaPago: String,

    // ======================
    // 🏠 DATOS VENTA
    // ======================
    precioOferta: Number,
    enganche: Number,
    formaPagoVenta: {
      type: String,
      enum: ['CONTADO', 'HIPOTECARIO', 'INFONAVIT', 'FOVISSSTE', 'OTRO']
    },
    fechaEscrituracion: Date,
    notaria: String,

    // ======================
    // 📝 COMUNES
    // ======================
    condiciones: String,
    observaciones: String,
    archivoUrl: String, // PDF final

    enviadoA: {
      type: String,
      enum: ['PROPIETARIO', 'CLIENTE'],
      default: 'PROPIETARIO',
    },
    
    firmaPropietario: {
      nombre: String,
      aceptado: Boolean,
      fecha: Date,
      ip: String,
      userAgent: String
    },

    estado: {
      type: String,
      enum: ['ENVIADA', 'ACEPTADA', 'RECHAZADA'],
      default: 'ENVIADA',
    },

    motivoRechazo: String,
    fechaRespuesta: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('CartaOferta', cartaOfertaSchema);
