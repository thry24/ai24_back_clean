const mongoose = require("mongoose");

const emailVerificationSchema = new mongoose.Schema({
  correo: { type: String, required: true }, 
  code: { type: String, required: true },
  verified: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
  nombre: { type: String, required: true },
  password: { type: String, required: true },
  rol: {
    type: String,
    enum: ["cliente", "agente", "inmobiliaria", "propietario"],
    required: true,
  },
  telefono: { type: String },
  fotoPerfil: { type: String },
  firmaDigital: { type: String },

  logo: { type: String },
  inmobiliaria: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});


// emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("EmailVerification", emailVerificationSchema);
