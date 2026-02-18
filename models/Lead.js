const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
  // 🔗 Relación
  propiedadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Propiedad' },
  agenteEmail: String,

  // 👤 Datos del contacto (snapshot)
  nombre: String,
  email: { type: String, required: true },
  telefono: String,
  rol: String,           // cliente / propietario / inmobiliaria
  tipoCliente: String,   // igual al rol
  mensaje: String,

  // 🧭 Contexto
  tipoOperacion: String, // venta / renta
  ubicacion: String,
  origen: {
    type: String,
    enum: ['propiedad', 'mensajes', 'mensajes-agentes', 'chatbot'],
    default: 'propiedad'
  },

  // ✅ NUEVO: tipo de lead para el flujo
  leadType: {
    type: String,
    enum: ['comprador', 'arrendatario', 'propietario'],
  },

  // ✅ NUEVO: tipo de propiedad que busca/ofrece
  tipoPropiedad: {
    type: String,
    enum: ['casa', 'departamento', 'terreno', 'local', 'bodega', 'rancho', 'oficina', 'edificio'],
  },

  // ✅ NUEVO: respuestas dinámicas según tipoPropiedad (casa/depa/terreno/etc.)
  features: { type: mongoose.Schema.Types.Mixed, default: {} },

  // ✅ NUEVO: intención / preguntas del flujo (comprador/arrendatario)
  presupuesto: Number,
  formaPago: { type: String, enum: ['credito', 'contado', 'no_se'] },
  cuandoComprar: String,

  cuandoMudarse: String, // renta
  mascotas: {
    tiene: Boolean,
    cantidad: Number,
  },
  tieneAvalOPoliza: Boolean,

  // ✅ NUEVO: propietario
  direccionInmueble: String,
  agenteId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // si quieres elegir agente por id
  formaContactoPreferida: { type: String, enum: ['whatsapp', 'correo', 'llamada'] },
  fechaCita: Date,
  comisionPorcentaje: Number,

  // 🔄 Estado del lead
  estatus: {
    type: String,
    enum: ['nuevo', 'contactado', 'cita', 'cerrado'],
    default: 'nuevo'
  },

  // ✅ NUEVO: helper para chatbot (opcional)
  chatbot: {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeadConversation' },
    state: String,          // OPERATION, PROPERTY_TYPE, FEATURES, etc.
    completed: { type: Boolean, default: false }
  },

}, { timestamps: true });

module.exports = mongoose.model('Lead', LeadSchema);
