const mongoose = require('mongoose');

const ObjetivoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },

  year: { type: Number, required: true, index: true },
  month: { type: Number, index: true }, // ✅ opcional si es objetivo anual

  objetivoComisiones: { type: Number, default: 0 },
  objetivoPropiedades: { type: Number, default: 0 },
  objetivoLeads: { type: Number, default: 0 },

  objetivoAnualComisiones: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Objetivo', ObjetivoSchema);
