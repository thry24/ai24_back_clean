const mongoose = require('mongoose');

const borradorContratoSchema = new mongoose.Schema(
  {
    seguimientoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seguimiento',
      required: true,
      index: true,
    },

    propiedadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Propiedad',
      required: true,
    },

    tipoOperacion: {
      type: String,
      enum: ['VENTA', 'RENTA'],
      required: true,
    },

    archivoUrl: {
      type: String,
      required: true,
    },

    enviadoPorEmail: {
      type: Boolean,
      default: true,
    },

    enviadoPorMensaje: {
      type: Boolean,
      default: true,
    },

    observaciones: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('BorradorContrato', borradorContratoSchema);
