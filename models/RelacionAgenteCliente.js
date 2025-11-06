const mongoose = require("mongoose");

const RelacionAgenteClienteSchema = new mongoose.Schema(
  {
    agente: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tipoCliente: {
      type: String,
      enum: ["comprador", "arrendatario", "propietario", null],
      default: null,
    },
    notas: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RelacionAgenteCliente", RelacionAgenteClienteSchema);
