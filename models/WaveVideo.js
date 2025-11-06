const mongoose = require('mongoose');

const WaveVideoSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  embedUrl: { type: String, required: true }, 
  tags: [String],
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('WaveVideo', WaveVideoSchema);
