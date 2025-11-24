const User = require("../models/User");
const Propiedad = require("../models/Propiedad");
const Mensaje = require("../models/Mensaje");
const Seguimiento = require("../models/Seguimiento");

exports.productividadInmobiliaria = async (req, res) => {
  try {
    const inmobiliariaId = req.user.inmobiliaria;
    if (!inmobiliariaId) {
      return res.status(403).json({ msg: "No perteneces a una inmobiliaria" });
    }

    // 1️⃣ Agentes de la inmobiliaria
    const agentes = await User.find({ inmobiliaria: inmobiliariaId })
      .select("_id nombre correo fotoPerfil")
      .lean();

    const correosAgentes = agentes.map(a => (a.correo || "").toLowerCase());

    let resultado = [];

    for (const ag of agentes) {
      const correo = (ag.correo || "").toLowerCase();

      // 2️⃣ Propiedades ingresadas por agente
      const props = await Propiedad.find({ agente: ag._id }).lean();
      const totalProp = props.length;

      // 3️⃣ Mensajes donde participa (como agente)
      const mensajes = await Mensaje.find({
        $or: [{ receptorEmail: correo }, { emisorEmail: correo }]
      })
        .sort({ createdAt: 1 })
        .lean();

      // 4️⃣ Clientes únicos (excluye correos internos)
      const clientesSet = new Set();
      mensajes.forEach(m => {
        const em = m.emisorEmail?.toLowerCase();
        const re = m.receptorEmail?.toLowerCase();
        if (em && !correosAgentes.includes(em)) clientesSet.add(em);
        if (re && !correosAgentes.includes(re)) clientesSet.add(re);
      });

      const clientes = clientesSet.size;

      // 5️⃣ Tiempo de respuesta promedio (minutos)
      let tiempos = [];

      for (let i = 0; i < mensajes.length - 1; i++) {
        const m1 = mensajes[i];
        const m2 = mensajes[i + 1];

        const esClienteM1 = !correosAgentes.includes(m1.emisorEmail?.toLowerCase());
        const esAgenteM2 = m2.emisorEmail?.toLowerCase() === correo;

        if (esClienteM1 && esAgenteM2) {
          const diff = (new Date(m2.createdAt) - new Date(m1.createdAt)) / 60000;
          if (diff >= 0 && diff < 180) tiempos.push(diff); // <= 3 horas
        }
      }

      const tiempoPromedio =
        tiempos.length > 0 ? Math.round(tiempos.reduce((a, b) => a + b) / tiempos.length) : 0;

      // 6️⃣ Leads y cierres desde Seguimientos
      const seg = await Seguimiento.find({ agenteEmail: correo }).lean();

      const leads = seg.length;
      const cierres = seg.filter(s => s.estadoFinal === "ganado").length;

      // 7️⃣ Citas programadas
      const citas = seg.filter(s => !!s.fechaCita).length;

      // 8️⃣ Respuesta final
      resultado.push({
        nombre: ag.nombre,
        foto: ag.fotoPerfil,
        propiedades: totalProp,
        clientes,
        tiempoRespuesta: `${tiempoPromedio} min`,
        leads,
        citas,
        cierres,
        mes: new Date().getMonth() + 1,
        anio: new Date().getFullYear()
      });
    }

    return res.json(resultado);
  } catch (err) {
    console.error("❌ Error en productividad:", err);
    res.status(500).json({ msg: "Error interno productividad" });
  }
};
