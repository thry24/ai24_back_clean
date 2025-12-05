const mongoose = require('mongoose');

const formularioSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['compra', 'renta','venta/renta'], required: true },
  tipoPropiedad: String,
  soy: String,
  nombre: String,
  apellidos: String,
  telefono: String,
  email: String,
  ciudad: String,
  municipio: String,
  caracteristicas: String,
  presupuestoMin: String,
  presupuestoMax: String,
  formaPago: String,
  medioContacto: String,
  cuentaPoliza: Boolean,
  cuentaAval: Boolean,
  cuantasMascotas: String,
  tiempoMudanza: String,
  estado: { type: String, enum: ['nuevo', 'en seguimiento', 'contactado', 'cerrado'], default: 'nuevo' },
  fechaEnvio: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Formulario', formularioSchema);
