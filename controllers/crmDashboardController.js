// controllers/crmDashboardController.js
const mongoose = require('mongoose');

const Propiedad = require('../models/Propiedad');
const User = require('../models/User');
const Objetivo = require('../models/Objetivo');
const Seguimiento = require('../models/Seguimiento');
const RelacionAgenteCliente = require('../models/RelacionAgenteCliente');


/* ---------------------------- Helpers de fechas ---------------------------- */
function rangeMes(year, month /* 1..12 */) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return { start, end };
}
function rangeAnio(year) {
  const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));
  return { start, end };
}
function mesAnterior(year, month) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}
function oid(id) {
  return new mongoose.Types.ObjectId(id);
}

/* ---------------------------- Reglas de negocio --------------------------- */
function esCierre(estado) {
  const s = String(estado || '').toLowerCase();
  // Estados que cuentan como "cerrada" para comisiones / conteo de cierres
  return ['con inquilino', 'rentada', 'vendida', 'cerrada'].includes(s);
}

function comisionMXN(prop) {
  const pct = Number(prop?.comision?.porcentaje || 0);
  const precio = Number(prop?.precio || 0);
  if (!isFinite(pct) || !isFinite(precio)) return 0;

  let monto = (precio * pct) / 100;

  // Si la operación es compartida, prorratea (ajústalo si tu negocio usa otra proporción)
  if (prop?.comision?.comparte === true) {
    monto = monto / 2;
  }

  return monto;
}

/* --------------------------------- Rutas ---------------------------------- */
exports.getObjetivos = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ msg: "No autenticado" });

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;

    const objetivoMes = {
      comisiones: objMensual?.objetivoComisiones ?? 0,
      propiedades: objMensual?.objetivoPropiedades ?? 0,
      leads: objMensual?.objetivoLeads ?? 0,
    };

    const objetivoAnual = {
      comisiones: objAnual?.objetivoAnualComisiones ?? 0,
    };


    return res.json({
      mensual: {
        objetivoComisiones: mensual?.objetivoComisiones ?? 0,
        objetivoPropiedades: mensual?.objetivoPropiedades ?? 0,
        objetivoLeads: mensual?.objetivoLeads ?? 0,
      },
      anual: {
        objetivoAnualComisiones: anual?.objetivoAnualComisiones ?? 0,
      },
      year,
      month,
    });

  } catch (err) {
    console.error("getObjetivos error:", err);
    return res.status(500).json({ msg: "Error al obtener objetivos" });
  }
};


exports.upsertObjetivo = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ msg: "No autenticado" });

    const { year, month, objetivoComisiones, objetivoPropiedades, objetivoLeads, objetivoAnualComisiones } = req.body;

    if (!Number.isInteger(year)) {
      return res.status(400).json({ msg: "Año inválido" });
    }

    // ✅ Si viene month → objetivo mensual
    const filter = {
      userId,
      year,
      ...(Number.isInteger(month) ? { month } : {})
    };

    const update = {
      $set: {
        objetivoComisiones: Number(objetivoComisiones) || 0,
        objetivoPropiedades: Number(objetivoPropiedades) || 0,
        objetivoLeads: Number(objetivoLeads) || 0,
        objetivoAnualComisiones: Number(objetivoAnualComisiones) || 0,
      }
    };

    const objetivo = await Objetivo.findOneAndUpdate(
      filter,
      update,
      { new: true, upsert: true }
    );

    res.json({ ok: true, objetivo });

  } catch (err) {
    console.error("upsertObjetivo error:", err);
    res.status(500).json({ msg: "Error al guardar objetivo" });
  }
};


exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ msg: 'No autenticado' });

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;

    const { start: mesIni, end: mesFin } = rangeMes(year, month);
    const { year: prevY, month: prevM } = mesAnterior(year, month);
    const { start: prevIni, end: prevFin } = rangeMes(prevY, prevM);
    const { start: yIni, end: yFin } = rangeAnio(year);

    // ✅ Objetivos actuales (mes y año) usando modelo actualizado
    const objMensual = await Objetivo.findOne({
      userId,
      year,
      month
    }).lean();

    const objAnual = await Objetivo.findOne({
      userId,
      year,
      month: null
    }).lean() || await Objetivo.findOne({
      userId,
      year,
      month: 0
    }).lean();

    const objetivoMes = {
      comisiones: objMensual?.objetivoComisiones ?? 0,
      propiedades: objMensual?.objetivoPropiedades ?? 0,
      leads: objMensual?.objetivoLeads ?? 0,
    };

    const objetivoAnual = {
      comisiones: objAnual?.objetivoAnualComisiones ?? 0,
    };

    // Filtros base
    const baseQ = { agente: oid(userId) };
    const baseQCerradas = {
      ...baseQ,
      estadoPropiedad: { $in: ['con inquilino', 'rentada', 'vendida', 'cerrada'] },
    };

    // Métricas: separamos queries para comisiones (cerradas) y para leads (todas)
    const [
      propsTotal, // total del agente (todas)
      propsMesCerradas,
      propsPrevCerradas,
      propsYTDCerradas,
      propsMesTodas, // para leads del mes
    ] = await Promise.all([
      Propiedad.countDocuments(baseQ),

      // Comisiones de este mes / previo / YTD (solo cerradas)
      Propiedad.find(
        { ...baseQCerradas, fechaCreacion: { $gte: mesIni, $lt: mesFin } },
        { precio: 1, comision: 1, estadoPropiedad: 1 }
      ).lean(),
      Propiedad.find(
        { ...baseQCerradas, fechaCreacion: { $gte: prevIni, $lt: prevFin } },
        { precio: 1, comision: 1, estadoPropiedad: 1 }
      ).lean(),
      Propiedad.find(
        { ...baseQCerradas, fechaCreacion: { $gte: yIni, $lt: yFin } },
        { precio: 1, comision: 1, estadoPropiedad: 1 }
      ).lean(),

      // Leads del mes: todas las propiedades creadas en el mes, sin importar estado
      Propiedad.find(
        { ...baseQ, fechaCreacion: { $gte: mesIni, $lt: mesFin } },
        { contactosGenerados: 1, estadoPropiedad: 1 }
      ).lean(),
    ]);

    const sumComisiones = (arr) => arr.reduce((acc, p) => acc + comisionMXN(p), 0);

    const comisionesMes = sumComisiones(propsMesCerradas);
    const comisionesPrev = sumComisiones(propsPrevCerradas);
    const comisionesYTD = sumComisiones(propsYTDCerradas);

    // ✅ ✅ Leads reales desde Seguimientos del agente
    const agente = await User.findById(userId).lean();
    const agenteEmail = agente?.correo?.toLowerCase() || agente?.email?.toLowerCase();

    const seguimientosMes = await Seguimiento.find({
      agenteEmail,
      fechaPrimerContacto: { $gte: mesIni, $lt: mesFin }
    }).lean();

    const leadsTotalesMes = seguimientosMes.length;
    const leadsGanadosMes = seguimientosMes.filter(s => s.estadoFinal === 'ganado').length;
    const leadsPerdidosMes = seguimientosMes.filter(s => s.estadoFinal === 'perdido').length;


    // Series por mes (12 meses): comisiones y cerradas SOLO con baseQCerradas
    const meses = Array.from({ length: 12 }, (_, i) => i + 1);
    const comisionesMensuales = [];
    const cerradasMensuales = [];

    for (const m of meses) {
      const { start, end } = rangeMes(year, m);
      const propsC = await Propiedad.find(
        { ...baseQCerradas, fechaCreacion: { $gte: start, $lt: end } },
        { precio: 1, comision: 1, estadoPropiedad: 1 }
      ).lean();

      comisionesMensuales.push(sumComisiones(propsC));
      cerradasMensuales.push(propsC.length); // ya vienen filtradas como "cerradas"
    }

    // Distribución por tipo de propiedad (todas las propiedades del agente)
    const tiposAgg = await Propiedad.aggregate([
      { $match: baseQ },
      { $group: { _id: '$tipoPropiedad', total: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    // Ingresadas últimos 6 meses (conteo de nuevas propiedades creadas, todas)
    const ultimos6 = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(Date.UTC(year, month - 1, 1));
      d.setUTCMonth(d.getUTCMonth() - i);
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
    }).reverse();

    const ingresadas6mEtiquetas = [];
    const ingresadas6mValores = [];
    for (const { y, m } of ultimos6) {
      const { start, end } = rangeMes(y, m);
      const c = await Propiedad.countDocuments({
        ...baseQ,
        fechaCreacion: { $gte: start, $lt: end },
      });
      ingresadas6mEtiquetas.push(`${m}/${String(y).slice(-2)}`);
      ingresadas6mValores.push(c);
    }
    // 📌 Nuevas métricas extra

    // --- Leads por propiedad ---
    const leadsPorPropiedad = await Seguimiento.aggregate([
      { $match: { agenteEmail }},
      { $group: { _id: "$propiedadId", total: { $sum: 1 }}},
      { $lookup: {
          from: "propiedads",
          localField: "_id",
          foreignField: "_id",
          as: "propiedad"
      }},
      { $unwind: "$propiedad" },
      { $project: {
          propiedad: "$propiedad.clave",
          total: 1
      }}
    ]);

    // --- Leads por origen ---
    const leadsPorOrigen = await Seguimiento.aggregate([
      { $match: { agenteEmail }},
      { $group: { _id: "$origen", total: { $sum: 1 }}},
      { $project: { origen: "$_id", total: 1, _id: 0 }}
    ]);

    // --- Conversión general del agente ---
    const totalLeads = await Seguimiento.countDocuments({ agenteEmail });
    const leadsGanados = await Seguimiento.countDocuments({ agenteEmail, estadoFinal: "ganado" });
    const conversionLeads = totalLeads > 0 
      ? Number(((leadsGanados / totalLeads) * 100).toFixed(2))
      : 0;


    // Respuesta
    res.json({
      objetivos: {
        mes: objetivoMes,
        anual: objetivoAnual,
      },
      metricas: {
        objetivoMesActual: comisionesMes,
        targetMes: objetivoMes.comisiones,
        mesAnterior: comisionesPrev,
        propiedadesTotal: propsTotal,
        comisionesYTD: comisionesYTD,
        leadsMes: {
          totales: leadsTotalesMes,
          ganados: leadsGanadosMes,
          perdidos: leadsPerdidosMes,
        },
      },
      graficas: {
        comisionesMensuales,
        cerradasMensuales,
        tipoPropiedad: tiposAgg.map((t) => ({ tipo: t._id || 'N/A', total: t.total })),
        ingresadas6m: {
          etiquetas: ingresadas6mEtiquetas,
          valores: ingresadas6mValores,
        },
      },
        extra: {
    conversionLeads,
    leadsPorPropiedad,
    leadsPorOrigen
  },
    });
  } catch (err) {
    console.error('getDashboard error:', err);
    res.status(500).json({ msg: 'Error interno al calcular dashboard' });
  }
};
// 🔥 Dashboard NIVEL INMOBILIARIA
// Dashboard para inmobiliaria
exports.getDashboardInmobiliaria = async (req, res) => {
  try {
    const inmobiliariaId = req.params.id;

    if (!inmobiliariaId) {
      return res.status(400).json({ msg: "ID inmobiliaria faltante" });
    }

    // Obtener asesores ligados a la inmobiliaria
    const asesores = await User.find({
      rol: "agente",
      inmobiliaria: inmobiliariaId
    }).lean();

    // Si no tiene asesores, devolvemos lista vacía
    if (!asesores.length) {
      return res.json({ asesores: [] });
    }

    // Construir estadísticas por asesor
    const asesoresStats = [];

    for (const a of asesores) {
      const propiedades = await Propiedad.find({ agente: a._id }).lean();

      const ventas = propiedades.filter(p => p.estadoPropiedad === "vendida").length;
      const rentas = propiedades.filter(p => p.estadoPropiedad === "rentada").length;

      const total = ventas + rentas;

      asesoresStats.push({
        _id: a._id,
        nombre: a.nombre,
        img: a.img || "https://via.placeholder.com/40x40",
        ventas,
        rentas,
        total
      });
    }

    res.json({ asesores: asesoresStats });

  } catch (err) {
    console.error("getDashboardInmobiliaria error:", err);
    res.status(500).json({ msg: "Error interno en dashboard inmobiliaria" });
  }
};
exports.getSeguimientosAgente = async (req, res) => {
  try {
    const { agenteId } = req.params;
    const filtro = req.query.filtro || "month";

    const match = { agente: agenteId };

    if (filtro === "day") {
      match.fecha = { $gte: new Date(new Date().setHours(0,0,0,0)) };
    } else if (filtro === "month") {
      match.fecha = {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      };
    } else if (filtro === "year") {
      match.fecha = {
        $gte: new Date(new Date().getFullYear(), 0, 1)
      };
    }

    const seguimientos = await Seguimiento.find(match).sort({ fecha: -1 });

    res.json({
      ok: true,
      seguimientos
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};
