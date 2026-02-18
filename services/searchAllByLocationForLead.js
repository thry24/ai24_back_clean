const Propiedad = require("../models/Propiedad");

function accentRegex(text = "") {
  const t = String(text || "").trim();
  if (!t) return null;

  const map = { a:"[aáàäâ]", e:"[eéèëê]", i:"[iíìïî]", o:"[oóòöô]", u:"[uúùüû]", n:"[nñ]" };
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = escaped.replace(/[aeioun]/gi, (c) => map[c.toLowerCase()] || c);
  return new RegExp(pattern, "i");
}

function buildImage(p) {
  return p.imagenPrincipal || (Array.isArray(p.imagenes) && p.imagenes[0]) || null;
}

async function searchAllByLocationForLead({ lead, loc }) {
  const rx = accentRegex(loc);
  if (!rx) return [];

  const query = {
    estadoPublicacion: "publicada",
    $or: [
      { "direccion.estado": rx },
      { "direccion.municipio": rx },
      { "direccion.colonia": rx },
    ],
  };

  // si quieres respetar operación (venta/renta) también aquí:
  if (lead?.tipoOperacion) {
    query.tipoOperacion = { $in: [lead.tipoOperacion, "venta/renta"] };
  }
  if (lead?.tipoPropiedad) query.tipoPropiedad = lead.tipoPropiedad;

  const props = await Propiedad.find(query)
    .select("_id titulo tipoOperacion tipoPropiedad precio precioRenta imagenPrincipal imagenes direccion")
    .sort({ fechaCreacion: -1 })
    .limit(12)
    .lean();

  return props.map((p) => ({
    id: p._id,
    titulo: p.titulo,
    precio: p.tipoOperacion === "renta" ? (p.precioRenta ?? p.precio) : p.precio,
    imagen: buildImage(p),
    ubicacion: [p?.direccion?.colonia, p?.direccion?.municipio, p?.direccion?.estado].filter(Boolean).join(", "),
    urlApp: `/detalle-propiedad/${p._id}`,
  }));
}

module.exports = { searchAllByLocationForLead };
