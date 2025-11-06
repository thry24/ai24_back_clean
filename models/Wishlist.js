const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  propiedad: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Propiedad',
    required: true
  },
  fechaAgregado: {
    type: Date,
    default: Date.now
  }
});

wishlistSchema.index({ usuario: 1, propiedad: 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);
