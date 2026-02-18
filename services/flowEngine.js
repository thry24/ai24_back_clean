// services/flowEngine.js

// ---------- PREGUNTAS BASE ----------
function questionOperation(leadType) {
  if (leadType === "propietario") {
    return {
      type: "select",
      key: "tipoOperacion",
      text: "¿Quieres rentar o vender tu propiedad?",
      options: [
        { label: "Rentar", value: "renta" },
        { label: "Vender", value: "venta" },
      ],
    };
  }

  return {
    type: "select",
    key: "tipoOperacion",
    text: "¿Qué tipo de operación estás buscando?",
    options: [
      { label: "Venta", value: "venta" },
      { label: "Renta", value: "renta" },
    ],
  };
}

function questionPropertyType() {
  return {
    type: "select",
    key: "tipoPropiedad",
    text: "¿Qué tipo de propiedad buscas?🤔🏘️🏢",
    options: [
      { label: "Casa", value: "casa" },
      { label: "Departamento", value: "departamento" },
      { label: "Terreno", value: "terreno" },
      { label: "Local comercial", value: "local" },
      { label: "Bodega", value: "bodega" },
      { label: "Rancho", value: "rancho" },
      { label: "Oficina", value: "oficina" },
      { label: "Edificio", value: "edificio" },
    ],
  };
}

function questionLocation() {
  return {
    type: "text",
    key: "ubicacion",
    text: "¿En qué ciudad/zona buscas?",
    placeholder: "Ej: Querétaro, Juriquilla",
  };
}

function questionFeatures(lead) {
  const tipoPropiedad = (lead?.tipoPropiedad || "").toLowerCase();

  const ejemplosPorTipo = {
    casa: [
      "recámaras", "baños", "estacionamiento", "m² de construcción",
      "jardín/roof", "presupuesto", "zona"
    ],
    departamento: [
      "recámaras", "baños", "estacionamiento", "nivel/piso",
      "amenidades", "presupuesto", "zona"
    ],

    // ✅ los que tú pediste:
    terreno: [
      "superficie (m²)", "frente y fondo", "uso de suelo",
      "servicios (agua/luz/drenaje)", "presupuesto", "zona"
    ],
    oficina: [
      "m²", "privados", "salas de juntas", "baños",
      "estacionamiento", "equipada o acondicionada", "presupuesto", "zona"
    ],
    rancho: [
      "superficie", "uso (agrícola/ganadero)", "pozo/agua",
      "corrales/casa/casco", "accesos", "presupuesto", "zona"
    ],
    edificio: [
      "uso (oficinas/mixto)", "pisos", "m² por piso / total",
      "elevador", "estacionamientos", "sistema contra incendios", "presupuesto", "zona"
    ],
    local: [
      "m²", "planta/nivel", "frente", "giro", "restricción de giro",
      "estacionamiento", "entrega (obra gris/equipado)", "presupuesto", "zona"
    ],

    // por si cae uno no contemplado:
    default: ["presupuesto", "zona", "m²", "requisitos clave"],
  };

  const lista = (ejemplosPorTipo[tipoPropiedad] || ejemplosPorTipo.default)
    .map((x) => `• ${x}`)
    .join("\n");

  const tipoTxt = tipoPropiedad ? ` (${tipoPropiedad})` : "";

  return {
    type: "text",
    key: "mensaje",
    text:
`Cuéntame los requisitos principales🫣😏${tipoTxt}
Ejemplos:
${lista}`,
    placeholder: "Escribe aquí…",
  };
}


function questionShowAllConfirm(lead) {
  const loc = (lead?.ubicacion || "tu zona").toString();
  return {
    type: "select",
    key: "extra.showAllConfirm",
    text: `No encontré coincidencias 😕 ¿Quieres que te muestre todas las propiedades de "${loc}" aunque no cumplan exactamente los requisitos?`,
    options: [
      { label: "Sí, muéstramelas", value: true },
      { label: "No, ajustaré requisitos", value: false },
    ],
  };
}

// (opcional) si quieres mantener un final para propietario
function questionSubmit() {
  return { type: "final", text: "¡Listo! ✅" };
}

// ---------- MAQUINA DE ESTADOS ----------
function getNextState({ leadType, state, lead }) {
  // ✅ confirmación "mostrar todas"
  if (state === "SHOW_ALL_CONFIRM") {
    // no importa si dijo sí o no, regresamos a FEATURES
    // (el controller se encarga de mostrar cards si dijo sí)
    return "FEATURES";
  }

  // ✅ comprador / arrendatario (SIN CONTACTO, SIN SUBMIT)
  if (leadType === "comprador" || leadType === "arrendatario") {
    if (state === "OPERATION") return "PROPERTY_TYPE";
    if (state === "PROPERTY_TYPE") return "LOCATION";
    if (state === "LOCATION") return "FEATURES";
    if (state === "FEATURES") return "FEATURES"; // 👈 se queda esperando
  }

  // ✅ propietario (si lo sigues usando)
  if (leadType === "propietario") {
    if (state === "OPERATION") return "ADDRESS";
    if (state === "ADDRESS") return "SELECT_AGENT";
    if (state === "SELECT_AGENT") return "PREFERRED_CONTACT";
    if (state === "PREFERRED_CONTACT") return "APPOINTMENT";
    if (state === "APPOINTMENT") return "COMMISSION";
    if (state === "COMMISSION") {
      const v = lead?.extra?.commissionPercent;
      return v === "otro" ? "COMMISSION_OTHER" : "SUBMIT";
    }
    if (state === "COMMISSION_OTHER") return "SUBMIT";
  }

  return "FEATURES";
}

function getQuestionForState({ leadType, state, lead }) {
  switch (state) {
    case "OPERATION":
      return questionOperation(leadType);

    case "PROPERTY_TYPE":
      return questionPropertyType();

    case "LOCATION":
      return questionLocation();

    case "FEATURES":
      return questionFeatures(lead);

    case "SHOW_ALL_CONFIRM":
      return questionShowAllConfirm(lead);

    // propietario
    case "ADDRESS":
      return {
        type: "text",
        key: "extra.addressText",
        text: "Escribe la dirección del inmueble:",
        placeholder: "Calle, número, colonia, ciudad",
      };

    case "SELECT_AGENT":
      return {
        type: "agent_select",
        key: "extra.selectedAgentId",
        text: "Selecciona el agente que quieres que promueva tu propiedad:",
        options: [],
      };

    case "PREFERRED_CONTACT":
      return {
        type: "select",
        key: "extra.preferredContact",
        text: "¿Cómo quieres que te contacte el agente?",
        options: [
          { label: "WhatsApp", value: "whatsapp" },
          { label: "Correo", value: "correo" },
          { label: "Llamada", value: "llamada" },
        ],
      };

    case "APPOINTMENT":
      return {
        type: "date",
        key: "extra.appointmentDate",
        text: "¿Cuándo agendamos cita para ver tu propiedad?",
      };

    case "COMMISSION":
      return {
        type: "select",
        key: "extra.commissionPercent",
        text: "¿Qué porcentaje de comisión estás dando?",
        options: [
          { label: "3%", value: 3 },
          { label: "4%", value: 4 },
          { label: "5%", value: 5 },
          { label: "6%", value: 6 },
          { label: "Otro", value: "otro" },
        ],
      };

    case "COMMISSION_OTHER":
      return {
        type: "number",
        key: "extra.commissionOther",
        text: "¿Qué porcentaje de comisión estás dando? (ej: 2.5)",
        placeholder: "Ej: 2.5",
      };

    case "SUBMIT":
      return questionSubmit();

    default:
      return { type: "text", key: "mensaje", text: "Continuemos..." };
  }
}

module.exports = { getNextState, getQuestionForState };
