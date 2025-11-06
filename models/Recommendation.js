const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  agente:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cliente:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  propiedad:{ type: mongoose.Schema.Types.ObjectId, ref: 'Propiedad', required: true },
  nota:     { type: String, trim: true, maxlength: 500 },
  estado:   { type: String, enum: ['pendiente','aceptada','rechazada'], default: 'pendiente' },
  vistoEn:  { type: Date }
}, { timestamps: true });

recommendationSchema.index({ cliente:1, propiedad:1 }, { unique: true });

module.exports = mongoose.model('Recommendation', recommendationSchema);
