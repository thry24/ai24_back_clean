// controllers/kpis.controller.js
const User = require("../models/User");
const Propiedad = require("../models/Propiedad");
const Busqueda = require("../models/Busqueda");

exports.kpiZonaMasBuscada = async (req, res) => {
  try {
    const inmobiliariaId = req.user.inmobiliaria;

    if (!inmobiliariaId) {
      return res.status(403).json({ msg: "No perteneces a una inmobiliaria" });
    }

    const resultados = await Busqueda.aggregate([
      { $match: { inmobiliaria: inmobiliariaId } },
      { $group: { _id: "$zona", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 1 }
    ]);

    res.json({
      zonaMasBuscada: resultados[0]?._id || "Sin datos",
      total: resultados[0]?.total || 0
    });

  } catch (err) {
    console.error("❌ Error KPI zona más buscada:", err);
    res.status(500).json({ msg: "Error interno" });
  }
};

exports.kpisInmobiliaria = async (req, res) => {
  try {
    const inmobiliariaId = req.user.inmobiliaria;

    if (!inmobiliariaId) {
      return res.status(403).json({ msg: "No perteneces a una inmobiliaria" });
    }

    // 1️⃣ Traer todos los agentes de la inmobiliaria
    const agentes = await User.find({ inmobiliaria: inmobiliariaId }).select("_id");

    const idsAgentes = agentes.map(a => a._id);

    // 2️⃣ Traer propiedades de esos agentes
    const propiedades = await Propiedad.find({ agente: { $in: idsAgentes } }).lean();

    // 3️⃣ Agrupar demanda por zona
    const demandaZonas = {};

    propiedades.forEach(p => {
      const zona = p.direccion?.zona || p.direccion?.colonia || "Sin zona";
      const leads = p.contactosGenerados || 0;

      if (!demandaZonas[zona]) demandaZonas[zona] = 0;
      demandaZonas[zona] += leads;
    });

    // 4️⃣ Determinar zona de mayor demanda
    const zonaMayorDemanda = Object.keys(demandaZonas).length
      ? Object.entries(demandaZonas).sort((a, b) => b[1] - a[1])[0][0]
      : "Sin datos";

    const resultado = propiedades.map(p => ({
    fechaAlta: p.fechaCreacion 
        ? new Date(p.fechaCreacion).toLocaleDateString("es-MX")
        : "Sin fecha",

    tipo: p.tipoPropiedad,
    id: p._id,
    imagen: p.imagenPrincipal,
    leads: p.contactosGenerados || 0,
    vistas: p.visitas || 0,
    colonia: p.direccion?.colonia || "N/A",
    zona: zonaMayorDemanda,
    costo: "Pendiente",
    }));

    res.json(resultado);

  } catch (err) {
    console.error("❌ Error en KPIs:", err);
    res.status(500).json({ msg: "Error interno al generar KPIs" });
  }
};
