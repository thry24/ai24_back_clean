const mongoose = require('mongoose');

const compararSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  propiedades: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Propiedad',
      required: true
    }
  ],
  fechaActualizado: {
    type: Date,
    default: Date.now
  }
});

compararSchema.index({ usuario: 1 }, { unique: true });

module.exports = mongoose.model('Comparar', compararSchema);
