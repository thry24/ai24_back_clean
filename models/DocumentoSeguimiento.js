const mongoose = require('mongoose');

const documentoSeguimientoSchema = new mongoose.Schema(
  {
    seguimientoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seguimiento',
      required: true,
    },

    propietarioEmail: String,
    clienteEmail: String,
    agenteEmail: String,

    tipoOperacion: {
      type: String,
      enum: ['VENTA', 'RENTA'],
      required: true,
    },

    tipoDocumento: {
      type: String,
      required: true,
    },

    archivoUrl: {
      type: String,
    },

    estado: {
      type: String,
      enum: ['PENDIENTE', 'SUBIDO', 'VALIDADO', 'RECHAZADO'],
      default: 'PENDIENTE',
    },

    observaciones: String,
  },
  { timestamps: true }
);

documentoSeguimientoSchema.index(
  { seguimientoId: 1, tipoDocumento: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  'DocumentoSeguimiento',
  documentoSeguimientoSchema
);
