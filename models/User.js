const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    correo: { type: String, required: true, unique: true },
    password: {
      type: String,
      required: function () {
        return this.authProvider === "local";
        },
      },
    rol: {
      type: String,
      enum: ["cliente", "agente", "inmobiliaria", "propietario"],
      required: true,
    },

    // 🔹 SOLO PARA CLIENTES
    tipoCliente: {
      type: String,
      enum: ["arrendatario", "comprador", "propietario"],
      default: null,
    },

    telefono: { type: String, unique: true, sparse: true },
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
    logo: String,

    inmobiliaria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inmobiliaria",
      default: null,
    },

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
  if (!this.password) return next(); // <- clave para google users
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

UserSchema.pre("save", function (next) {
  // 🚫 Si no es cliente, eliminamos tipoCliente
  if (this.rol !== "cliente") {
    this.tipoCliente = null;
  }

  next();
});

module.exports = mongoose.model("User", UserSchema);
