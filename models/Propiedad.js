const mongoose = require("mongoose");

const propiedadSchema = new mongoose.Schema({
  tipoOperacion: { type: String, enum: ["venta", "renta","venta/renta"], required: true },
  tipoPropiedad: {
    type: String,
    enum: [
      "casa",
      "departamento",
      "terreno",
      "local",
      "bodega",
      "rancho",
      "oficina",
      "edificio",
    ],
    required: true,
  },
  clave: { type: String },

  visitas: {
    type: Number,
    default: 0,
  },
  contactosGenerados: {
    type: Number,
    default: 0,
  },
  leadsGanados: {
    type: Number,
    default: 0,
  },
  leadsPerdidos: {
    type: Number,
    default: 0,
  },


  precio: { type: Number, required: true },
  precioRenta: { type: Number, required: false },
  descripcion: String,

  direccion: {
    pais: { type: String, default: 'México' },
    estado: String,
    municipio: String,
    colonia: String,

    calle: String,
    numeroExterior: String,
    numeroInterior: String,
    codigoPostal: String,

    lat: Number,
    lng: Number,
  },


  estadoPropiedad: {
    type: String,
    enum: ["activa", "oportunidad", "remate bancario", "con inquilino",'nueva', 'preventa'],
    default: "activa",
  },

  comision: {
    comparte: { type: Boolean, default: false },

    porcentaje: { type: Number },

    venta: { type: Number },
    renta: { type: Number },
  },

  datosPropietario: {
    nombre: String,
    telefono: String,
    email: String,
  },

  archivos: [
    {
      nombre: String,
      tipo: String,
      url: String,
    },
  ],

  caracteristicas: {
    casaDepto: {
      habitaciones: Number,
      recamaraPB: Boolean,
      banosCompletos: Number,
      mediosBanos: Number,
      estacionamiento: String,
      closetVestidor: String,
      superficie: String,
      construccion: String,
      tipoEstacionamiento: String,
      pisos: Number,
      cocina: String,
      barraDesayunador: Boolean,
      balcon: Boolean,
      salaTV: Boolean,
      patio: Boolean,
      estudio: Boolean,
      roofGarden: Boolean,
      areaLavado: {
        activo: { type: Boolean, default: false },
        tipo: {
          type: String,
          enum: ["ninguno", "techada", "sin_techar"],
          default: "ninguno"
        }
      },
      cuartoServicio: Boolean,
      sotano: Boolean,
      jardin: Boolean,
      terraza: Boolean,
        // 🔹 SOLO CASA
  casa: {
    tipo: {
      type: String,
      enum: ["privada", "calle_abierta", "condominio", "uso_comercial"],
      default: undefined
    }
  },

  // 🔹 SOLO DEPARTAMENTO
  departamento: {
    nivel: {
      type: String,
      enum: ["planta_baja", "planta_alta"],
      default: undefined   // 🔥 CLAVE
    },
    numeroPiso: {
      type: Number,
      default: null
    }
  },
    },

    terreno: {
      m2Frente: String,
      m2Fondo: String,
      superficie: String,
      tipo: String,
      costoXM2: String,
      kmz: Boolean,
      agua: Boolean,
      luz: Boolean,
      drenaje: Boolean,
    },

    local: {
      tipoCentro: String,
      plaza: String,
      pasillo: String,
      planta: String,
      superficie: String,
      m2Frente: String,
      m2Fondo: String,
      restriccionGiro: String,
      giro: String,
      seguridad: Boolean,
      elevador: Boolean,
      costoMantenimiento: Number,    // nuevo
      entrega: String, 
      estacionamiento: String,
      tipoEstacionamiento: String,
    },

    bodega: {
      tipo: String,
      m2Terreno: String,
      m2Construccion: String,
      oficinas: Number,
      banos: Number,
      recepcion: Boolean,
      mezzanine: Boolean,
      comedor: Boolean,
      andenCarga: Boolean,
      rampas: Boolean,
      patioManiobras: Boolean,
      resistenciaPiso: String,
      recoleccionResiduos: Boolean,
      subestacion: Boolean,
      cargaElectrica: String,
      kva: String,
      crossDocking: Boolean,
      techoLoza: Boolean,
      techoLamina: Boolean,
      arcoTecho: Boolean,
      banosEmpleados: Number,
      Vigilancia : Boolean,
      Sistemaantiincendios: Boolean,
      Cocina : Boolean
    },

    rancho: {
      superficie: String,
      unidadSuperficie: String,
      uso: String,
      pozo: Boolean,
      corrales: Boolean,
      casa: Boolean,
      casco: Boolean,
      establo: Boolean,
      invernadero: Boolean,
      bordo: Boolean,
      riegoTemporal: Boolean,
      bodega: Boolean,
    },

    oficina: {
      superficie: Number,
      uso: String,
      privados: Number,
      salaJuntas: Number,
      banosPrivados: Number,
      banosCompartidos: Number,
      comedores: Boolean,
      empleados: Number,
      corporativo: Boolean,
      cocina: Boolean,
      aireAcondicionado: Boolean,
      equipadas: Boolean,
      estacionamiento: Boolean,
      entrega: String,
    },

    edificio: {
      m2xPiso: String,
      uso: String,
      pisosEdificio: Number,
      oficinas: Number,
      sistemaIncendios: Boolean,
      aguasPluviales: Boolean,
      aguasNegras: Boolean,
      gatosHidraulicos: Boolean,
      autosustentable: Boolean,
      estacionamientos: Number,
      elevador: Boolean,
      Mezanine: Boolean,
      aireAcondicionado: Boolean,
      comedor: Boolean,
      corporativo: Boolean,
      seguridad: Boolean,
      banos: Number,

    },
  },

  generales: {
    cisterna: Boolean,
    hidroneumatico: Boolean,
    cancelesBano: Boolean,
    riegoAspersion: Boolean,
    calentadorSolar: Boolean,
    lamparasSolares: Boolean,
    aireAcondicionado: Boolean,
    alarma: Boolean,
    bodega: Boolean,
    calefaccion: Boolean,
    chimenea: Boolean,
    circuitoCerrado: Boolean,
    sistemaInteligente: Boolean,
    seguridad24h: Boolean,
    vistaPanoramica: Boolean,
    vistaFloraFauna: Boolean,
    vistaGolf: Boolean,
  },
  servicios: {
    tipoGas: Boolean,
    internet: Boolean,
    gasNatural: Boolean,
    gasLP: Boolean,
    telefonia: Boolean,
    tv: Boolean,
    enchufeCarros: Boolean,
    elevador: Boolean,
  },
  amenidades: {
    juegosInfantiles: Boolean,
    campoGolf: Boolean,
    gimnasio: Boolean,
    ludoteca: Boolean,
    salonEvento: Boolean,
    asadores: Boolean,
    lagos: Boolean,
    petFriendly: Boolean,
    piscina: Boolean,
    jacuzzi: Boolean,
    jogging: Boolean,
    futbol: Boolean,
    tenis: Boolean,
    squash: Boolean,
    paddle: Boolean,
    basket: Boolean,
    volley: Boolean,
    albercaPrivada: Boolean,
    areasVerdes: Boolean,
    otros: String,
  },

  imagenes: [String],

  imagenPrincipal: String,

  agente: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  inmobiliaria: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  keywords: [String],

  estadoPublicacion: {
    type: String,
    enum: ["publicada", "no publicada"],
    default: "no publicada",
  },
  fechaCreacion: { type: Date, default: Date.now },
});

propiedadSchema.pre("save", function (next) {
  const tipo = this.tipoPropiedad;
  const grupo = tipo === "casa" || tipo === "departamento" ? "casaDepto" : tipo;
  const data = this.caracteristicas?.[grupo] || {};
  const keywords = [];

  const frases = {
    habitaciones: (v) => `${v} recámara${v > 1 ? "s" : ""}`,
    recamaraPB: (v) => (v ? "Recámara en planta baja" : ""),
    banosCompletos: (v) =>
      `${v} baño${v > 1 ? "s" : ""} completo${v > 1 ? "s" : ""}`,
    mediosBanos: (v) => `${v} medio baño${v > 1 ? "s" : ""}`,
    estacionamiento: (v) => `${v} cajón${v > 1 ? "es" : ""} de estacionamiento`,
    closetVestidor: (v) => (v ? "Clóset vestidor" : ""),
    superficie: (v) => `Superficie de ${v} m²`,
    construccion: (v) => `Construcción de ${v} m²`,
    pisos: (v) => `${v} piso${v > 1 ? "s" : ""}`,
    cocina: (v) => (v ? `Cocina tipo ${v}` : ""),
    barraDesayunador: (v) => (v ? "Barra desayunador" : ""),
    balcon: (v) => (v ? "Balcón" : ""),
    salaTV: (v) => (v ? "Sala de TV" : ""),
    estudio: (v) => (v ? "Estudio" : ""),
    areaLavado: (v) => {
      if (!v || !v.activo) return "";
      if (v.tipo === "techada") return "Área de lavado techada";
      if (v.tipo === "sin_techar") return "Área de lavado sin techar";
      return "Área de lavado";
    },
    cuartoServicio: (v) => (v ? "Cuarto de servicio" : ""),
    sotano: (v) => (v ? "Sótano" : ""),
    jardin: (v) => (v ? "Jardín" : ""),
    terraza: (v) => (v ? "Terraza" : ""),
    m2Frente: (v) => `Frente de ${v} m`,
    m2Fondo: (v) => `Fondo de ${v} m`,
    tipo: (v) => `Tipo: ${v}`,
    costoXM2: (v) => `Costo por m²: ${v}`,
    kmz: (v) => (v ? "Incluye archivo KMZ" : ""),
    agua: (v) => (v ? "Con agua" : ""),
    luz: (v) => (v ? "Con luz" : ""),
    drenaje: (v) => (v ? "Con drenaje" : ""),
    plaza: (v) => `Ubicado en plaza ${v}`,
    planta: (v) => `Planta ${v}`,
    oficinas: (v) => `${v} oficina${v > 1 ? "s" : ""}`,
    banos: (v) => `${v} baño${v > 1 ? "s" : ""}`,
    salaJuntas: (v) => `${v} sala${v > 1 ? "s" : ""} de juntas`,
    privados: (v) => `${v} privado${v > 1 ? "s" : ""}`,
    comedores: (v) => (v ? "Comedor disponible" : ""),
    empleados: (v) => `${v} empleados`,
    hectareas: (v) => `${v} hectárea${v > 1 ? "s" : ""}`,
    resistenciaPiso: (v) => `Piso con resistencia de ${v}`,
    cargaElectrica: (v) => `Carga eléctrica: ${v}`,
    kva: (v) => `${v} KVA`,
    estacionamientos: (v) =>
      `${v} lugar${v > 1 ? "es" : ""} de estacionamiento`,

      areaLavado: (v) => {
    if (!v || !v.activo) return "";
    if (v.tipo === "techada") return "Área de lavado techada";
    if (v.tipo === "sin_techar") return "Área de lavado sin techar";
    return "Área de lavado";
  },

  casa: (v) => {
    if (!v || !v.tipo) return "";
    const map = {
      privada: "Casa en privada",
      calle_abierta: "Casa en calle abierta",
      condominio: "Casa en condominio",
      uso_comercial: "Casa de uso comercial",
    };
    return map[v.tipo] || "Casa";
  },

  departamento: (v) => {
    if (!v) return "";
    let txt = "Departamento";
    if (v.nivel === "planta_baja") txt += " en planta baja";
    if (v.nivel === "planta_alta") txt += " en planta alta";
    if (v.numeroPiso) txt += `, piso ${v.numeroPiso}`;
    return txt;
  },
  };

for (const key in data) {
  const valor = data[key];

  // ❌ Evitar objetos sin formateador
  if (typeof valor === "object" && !frases[key]) continue;

  // ❌ Evitar vacíos
  if (!valor && typeof valor !== "number") continue;

  const frase = frases[key] ? frases[key](valor) : "";
  if (frase) keywords.push(frase);
}


  this.keywords = keywords;
  next();
});

module.exports = mongoose.model("Propiedad", propiedadSchema);
