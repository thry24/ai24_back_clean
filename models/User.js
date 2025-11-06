const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    correo: { type: String, required: true },
    password: { type: String, required: true },

    rol: {
      type: String,
      enum: ["cliente", "agente", "inmobiliaria", "propietario"],
      required: true,
    },

    // 🔹 Tipo de cliente (solo para clientes)
    tipoCliente: {
      type: String,
      enum: ["arrendatario", "comprador", "propietario"],
      default: null,
    },

    telefono: { type: String },
    fotoPerfil: { type: String },
    firmaDigital: { type: String },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
      index: true,
    },

    googleId: { type: String, index: true, sparse: true },
    picture: String,
    logo: { type: String },
    inmobiliaria: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    disponibilidad: [
      {
        dia: {
          type: String,
          enum: [
            "lunes",
            "martes",
            "miércoles",
            "jueves",
            "viernes",
            "sábado",
            "domingo",
          ],
        },
        horas: [String],
      },
    ],

    // 🔹 Plan / Suscripción
    tipoPlan: {
      type: String,
      enum: ["gratis", "mensual", "anual"],
      default: "gratis",
    },
    planActivo: { type: Boolean, default: false },
    planExpira: { type: Date, default: null },
  },
  { timestamps: true }
);

// 🔒 Encriptar contraseña antes de guardar
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("User", UserSchema);
