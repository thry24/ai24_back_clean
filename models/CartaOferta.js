const mongoose = require('mongoose');

const CartaOfertaSchema = new mongoose.Schema({
  seguimientoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seguimiento' },
  propiedadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Propiedad' },
  tipoOperacion: String,
  montoOferta: Number,
  condiciones: String,
  archivoUrl: String,
  estado: {
    type: String,
    enum: ['ENVIADA', 'ACEPTADA', 'RECHAZADA'],
    default: 'ENVIADA'
  },
  enviadoA: String,
  fechaRespuesta: Date
}, { timestamps: true });

module.exports = mongoose.model('CartaOferta', CartaOfertaSchema);
