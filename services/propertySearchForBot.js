// services/propertySearchForBot.js
const Propiedad = require("../models/Propiedad");
const { parseRequirements } = require("../utils/parseRequirements");

function buildImage(p) {
  return p.imagenPrincipal || (Array.isArray(p.imagenes) && p.imagenes[0]) || null;
}

// ✅ Regex tolerante a acentos: queretaro => matchea Querétaro
function accentRegex(text = "") {
  const t = String(text || "").trim();
  if (!t) return null;

  const map = {
    a: "[aáàäâ]",
    e: "[eéèëê]",
    i: "[iíìïî]",
    o: "[oóòöô]",
    u: "[uúùüû]",
    n: "[nñ]",
  };

  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = escaped.replace(/[aeioun]/gi, (c) => map[c.toLowerCase()] || c);

  return new RegExp(pattern, "i");
}

async function searchPropertiesForLead({ lead, mensaje }) {
  const parsed = parseRequirements(mensaje || "");

  const query = {
    estadoPublicacion: "publicada",
  };

  // ✅ tipoOperacion: incluye "venta/renta"
  if (lead?.tipoOperacion) {
    query.tipoOperacion = { $in: [lead.tipoOperacion, "venta/renta"] };
  }

  if (lead?.tipoPropiedad) query.tipoPropiedad = lead.tipoPropiedad;

  // ✅ ubicación: si el usuario la pone en FEATURES, úsala (y corrige lead.ubicacion)
  const locRaw = (parsed.locationText || lead?.ubicacion || "").toString().trim();
  if (locRaw) {
    const rx = accentRegex(locRaw);

    // rx puede ser null si viene vacío, por eso revisamos
    if (rx) {
      query.$or = [
        { "direccion.estado": rx },
        { "direccion.municipio": rx },
        { "direccion.colonia": rx },
      ];
    }
  }

  // ✅ características (casa/depto)
  const isCasaDepto = lead?.tipoPropiedad === "casa" || lead?.tipoPropiedad === "departamento";
  if (isCasaDepto) {
    if (parsed.rooms != null) query["caracteristicas.casaDepto.habitaciones"] = { $gte: parsed.rooms };
    if (parsed.baths != null) query["caracteristicas.casaDepto.banosCompletos"] = { $gte: parsed.baths };
  }

  // ✅ presupuesto
  if (parsed.budget != null) {
    if (lead?.tipoOperacion === "renta") query.precioRenta = { $lte: parsed.budget };
    else query.precio = { $lte: parsed.budget };
  }

  const props = await Propiedad.find(query)
    .select("_id titulo tipoOperacion tipoPropiedad precio precioRenta imagenPrincipal imagenes direccion")
    .sort({ fechaCreacion: -1 })
    .limit(12)
    .lean();

  const items = props.map((p) => ({
    id: p._id,
    titulo: p.titulo,
    precio: p.tipoOperacion === "renta" ? (p.precioRenta ?? p.precio) : p.precio,
    imagen: buildImage(p),
    ubicacion: [p?.direccion?.colonia, p?.direccion?.municipio, p?.direccion?.estado]
      .filter(Boolean)
      .join(", "),
    // ✅ tu ruta real del app-routing
    urlApp: `/detalle-propiedad/${p._id}`,
  }));

  return { parsed, items };
}

module.exports = { searchPropertiesForLead };
