// controllers/botSearch.controller.js
const Propiedad = require("../models/Propiedad");
const { parseRequirements } = require("../utils/parseRequirements");

function buildImage(p) {
  return (
    p.imagenPrincipal ||
    (Array.isArray(p.imagenes) && p.imagenes[0]) ||
    (Array.isArray(p.archivos) && p.archivos.find(a => a?.tipo?.startsWith("image/"))?.url) ||
    null
  );
}

exports.searchPropertiesForBot = async (req, res) => {
  try {
    const { tipoOperacion, tipoPropiedad, ubicacion, mensaje } = req.body || {};

    const parsed = parseRequirements(mensaje || "");
    const query = {
      estadoPublicacion: "publicada",
    };

    // filtros base del lead (si ya los tienes)
    if (tipoOperacion) query.tipoOperacion = tipoOperacion;
    if (tipoPropiedad) query.tipoPropiedad = tipoPropiedad;

    // ubicación (tu lead trae "ubicacion" como texto libre)
    // y además intentamos extraer algo del mensaje.
    const loc = (parsed.locationText || (ubicacion || "")).toString().trim();
    if (loc) {
      query.$or = [
        { "direccion.estado": new RegExp(loc, "i") },
        { "direccion.municipio": new RegExp(loc, "i") },
        { "direccion.colonia": new RegExp(loc, "i") },
      ];
    }

    // filtros por características (solo casa/depto)
    const isCasaDepto = tipoPropiedad === "casa" || tipoPropiedad === "departamento";
    if (isCasaDepto) {
      if (parsed.rooms != null) {
        query["caracteristicas.casaDepto.habitaciones"] = { $gte: parsed.rooms };
      }
      if (parsed.baths != null) {
        query["caracteristicas.casaDepto.banosCompletos"] = { $gte: parsed.baths };
      }

      // OJO: en tu schema estacionamiento es String.
      // Para no romper, lo hacemos “suave” por keywords:
      // (si en el futuro lo vuelves Number, aquí lo cambias a $gte)
    }

    // presupuesto (venta vs renta)
    if (parsed.budget != null) {
      if (tipoOperacion === "renta") {
        query.precioRenta = { $lte: parsed.budget };
      } else {
        query.precio = { $lte: parsed.budget };
      }
    }

    // fallback por keywords (tu schema tiene keywords: [String])
    // Esto ayuda cuando el user escribe “jardín, roof, etc.”
    if (parsed.tokens?.length) {
      query.keywords = { $in: parsed.tokens.map(t => new RegExp(t, "i")) };
    }

    // trae pocas y útiles para cards
    const props = await Propiedad.find(query)
      .select("_id titulo tipoOperacion tipoPropiedad precio precioRenta imagenPrincipal imagenes direccion")
      .sort({ fechaCreacion: -1 })
      .limit(8)
      .lean();

    const items = props.map(p => ({
      id: p._id,
      titulo: p.titulo,
      tipoOperacion: p.tipoOperacion,
      tipoPropiedad: p.tipoPropiedad,
      precio: p.tipoOperacion === "renta" ? (p.precioRenta ?? p.precio) : p.precio,
      imagen: buildImage(p),
      ubicacion: [p?.direccion?.colonia, p?.direccion?.municipio, p?.direccion?.estado].filter(Boolean).join(", "),
      // url que usará tu app (ajústalo a tu routing real)
      urlApp: `/propiedad/${p._id}`,
    }));

    return res.json({
      ok: true,
      parsed,
      count: items.length,
      items,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, msg: "Error buscando propiedades" });
  }
};
