const mongoose = require("mongoose");

const colaboracionSchema = new mongoose.Schema(
  {
    agentePrincipal: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    colaborador: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    tipoColaboracion: {
      type: String,
      enum: ["inmobiliaria", "externo", "manual"],
      required: true,
    },

    nombreColaborador: { type: String, required: true },
    colaboradorEmail: { type: String },
    nombreAgente: { type: String },
    agenteEmail: { type: String },

    propiedad: { type: mongoose.Schema.Types.ObjectId, ref: "Propiedad" },
    nombrePropiedad: { type: String },
    imagenPropiedad: { type: String },

    tipoOperacion: {
      type: String,
      enum: ["VENTA", "RENTA"],
      required: true,
    },

    comision: { type: Number, default: 0 },
    nota: { type: String },

    seguimientoActivo: { type: Boolean, default: false },
    seguimiento: { type: mongoose.Schema.Types.ObjectId, ref: "Seguimiento" },

    propiedadElegida: { type: Boolean, default: false },

    estado: {
      type: String,
      enum: ["pendiente", "aceptada", "rechazada"],
      default: "pendiente",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Colaboracion", colaboracionSchema);
