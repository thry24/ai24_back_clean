const mongoose = require('mongoose');

const seguimientoSchema = new mongoose.Schema(
  {
    clienteEmail: { type: String, required: true },
    clienteNombre: { type: String },
    agenteEmail: { type: String, required: true },
    tipoCliente: { type: String, default: 'cliente' },

    // 🔹 Tipo de operación — acepta cualquier caso (venta/VENTA)
    tipoOperacion: {
      type: String,
      enum: ['VENTA', 'RENTA', 'VENTA/RENTA'],
      default: '',
      set: (v) => (v ? v.toUpperCase() : ''), // 👈 convierte automáticamente a mayúsculas
    },

    fechaPrimerContacto: { type: Date, default: Date.now },
    fechaFinalizacion: { type: Date },

    // 🏠 Fechas venta
    fechaEleccion: Date,
    fechaCita: Date,
    fechaRecorrido: Date,
    fechaCarta: Date,
    docsCompletos: { type: Boolean, default: false },
    fechaAceptacion: Date,
    fechaNotaria: Date,
    fechaBorrador: Date,
    fechaFirma: Date,

    // 🏢 Fechas renta
    fechaCartaOferta: Date,
    documentosCompletos: { type: Boolean, default: false },
    fechaBorradorArr: Date,
    fechaFirmaArr: Date,

    estatus: { type: String, default: 'En proceso' },
    estatusOtraMotivo: { type: String, default: '' },

    // 🔹 Origen del lead — también acepta email/whatsapp sin importar el caso
    origen: {
      type: String,
      enum: ['MENSAJES', 'COLABORACIONES', 'MANUAL', 'EMAIL', 'WHATSAPP'],
      default: 'MANUAL',
      set: (v) => (v ? v.toUpperCase() : 'MANUAL'),
    },

    // 🔗 Propiedad relacionada
    propiedadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Propiedad' },

    estadoFinal: {
      type: String,
      enum: ['GANADO', 'PERDIDO', 'EN PROCESO'],
      default: 'EN PROCESO',
      set: (v) => (v ? v.toUpperCase() : 'EN PROCESO'),
    },

    fechaCierre: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Seguimiento', seguimientoSchema);
