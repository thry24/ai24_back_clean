const { Schema, model } = require('mongoose');

const CitaSchema = new Schema(
  {
    // 🔗 RELACIONES
    recorridoId:   { type: Schema.Types.ObjectId, ref: 'Recorrido', required: true },
    seguimientoId: { type: Schema.Types.ObjectId, ref: 'Seguimiento', required: true },
    propiedadId:   { type: Schema.Types.ObjectId, ref: 'Propiedad', required: true },

    // 👥 PARTICIPANTES
    agenteEmail:   { type: String, required: true, index: true }, // dueño propiedad
    agenteNombre:  { type: String },
    clienteEmail:  { type: String, required: true },
    clienteNombre: { type: String },
    tipoCliente: {
      type: String,
      enum: ['propietario', 'comprador', 'arrendatario'],
      required: true
    },

    // 🏠 INFO PROPIEDAD
    propiedadClave: { type: String },
    tipoOperacion:  { type: String, enum: ['VENTA','RENTA'], required: true },

    // 🗓️ FECHA / HORA
    fecha: { type: Date, required: true },
    hora:  { type: String, required: true }, // "10:00"

    // 📌 ESTADO
    estado: {
      type: String,
      enum: ['pendiente','confirmada','cancelada','finalizada'],
      default: 'pendiente'
    },
    propiedadDireccion: {
      type: String,
      required: true
    },

    // 📝 NOTAS COMPARTIDAS
    notaAgente:  { type: String, default: '' },
    notaCliente: { type: String, default: '' },

    tipoEvento: { type: String, default: 'Recorrido' }
  },
  { timestamps: true }
);

module.exports = model('Cita', CitaSchema);
