const mongoose = require('mongoose');

const investigacionRentaSchema = new mongoose.Schema(
  {
    seguimientoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seguimiento',
      required: true,
      index: true,
    },

    clienteEmail: { type: String, required: true },
    agenteEmail: { type: String, required: true },

    tipo: {
      type: String,
      enum: ['AVAL', 'POLIZA'],
      required: true,
    },

    resultado: {
      type: String,
      enum: ['PENDIENTE', 'APROBADO', 'RECHAZADO'],
      default: 'PENDIENTE',
    },

    proveedor: String, // nombre póliza jurídica
    observaciones: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('InvestigacionRenta', investigacionRentaSchema);
