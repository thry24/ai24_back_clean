const { Schema, model } = require('mongoose');

const CitaSchema = new Schema(
  {
    seguimientoId: { type: Schema.Types.ObjectId, ref: 'Seguimiento', required: true },
    propiedadId:   { type: Schema.Types.ObjectId, ref: 'Propiedad',   required: true },
    agenteEmail:   { type: String, required: true, index: true },
    clienteEmail:  { type: String, required: true },
    clienteNombre: { type: String },       // opcional
    tipoOperacion: { type: String, enum: ['VENTA','RENTA'], required: true },
    agenteNombre: { type: String, default: "" },
    tipoCliente: { type: String, default: "" },
    propiedadClave: { type: String, default: "" },
    tipoEvento: { type: String, default: "Recorrido" },

    // 👇 IMPORTANTE: fecha es Date real; hora es texto "HH:mm"
    fecha:         { type: Date, required: true },
    hora:          { type: String, required: true }, // "09:00" etc.

    // opcional: estado, notas, etc
    estado:        { type: String, enum: ['pendiente','confirmada','finalizada','cancelada'], default: 'pendiente' },
    notas:         { type: String }
  },
  { timestamps: true }
);

module.exports = model('Cita', CitaSchema);
