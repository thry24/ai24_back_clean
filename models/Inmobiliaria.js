const mongoose = require('mongoose');

const CategoriaSchema = new mongoose.Schema({
  nombre: String,
  imagen: String
}, { _id: false });

const InmobiliariaSchema = new mongoose.Schema({
  // 🔹 Datos básicos
  nombre: { type: String, required: true },
  direccion: { type: String, default: "" },
  telefono: { type: String, required: true },
  correo: { type: String, required: true },
  status: { type: String, default: 'Active' },

  // 🔹 Plan
  tipoPlan: {
    type: String,
    enum: ["gratis", "mensual", "anual"],
    default: "gratis",
  },
  planActivo: { type: Boolean, default: false },
  planExpira: { type: Date, default: null },

  // 🔹 Branding y colores
logo: { type: String, default: null },
heroImage: { type: String, default: null },
heroTitulo: { type: String, default: "Encuentra tu propiedad ideal" },
heroSubtitulo: { type: String, default: "" },

descripcion: { type: String, default: "" },

colorPrimario: { type: String, default: '#1e88e5' },
colorSecundario: { type: String, default: '#ffffff' },



  // 🔹 Categorías visuales
  categorias: [CategoriaSchema],



}, { timestamps: true });

module.exports =
  mongoose.models.Inmobiliaria ||
  mongoose.model("Inmobiliaria", InmobiliariaSchema);
