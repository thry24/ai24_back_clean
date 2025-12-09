const mongoose = require("mongoose");

const BusquedaSchema = new mongoose.Schema({
  keyword: { type: String, default: "" },
  tipoOperacion: { type: String, default: "" },
  estado: { type: String, default: "" },
  zona: { type: String, default: "" },

  usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  inmobiliaria: { type: mongoose.Schema.Types.ObjectId, ref: "Inmobiliaria", default: null },

  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Busqueda", BusquedaSchema);
