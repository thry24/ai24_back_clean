const mongoose = require('mongoose');

const InmobiliariaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  direccion: { type: String, default: "" },
  telefono: { type: String, required: true },
  correo: { type: String, required: true },
  status: { type: String, default: 'Active' },

  tipoPlan: {
    type: String,
    enum: ["gratis", "mensual", "anual"],
    default: "gratis",
  },

  planActivo: { type: Boolean, default: false },
  planExpira: { type: Date, default: null },

  logo: { type: String, default: null }

}, { timestamps: true });

module.exports =
  mongoose.models.Inmobiliaria ||
  mongoose.model("Inmobiliaria", InmobiliariaSchema);
