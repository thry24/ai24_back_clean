const Cita = require('../models/Cita');
const Seguimiento = require('../models/Seguimiento');

// helper: compone Date real (UTC) con "YYYY-MM-DD" + "HH:mm"
function parseFechaHora(fechaStr, horaStr) {
  if (!fechaStr || !horaStr) return null;
  const [y, m, d] = String(fechaStr).split('-').map(Number);
  const [H, Mi]   = String(horaStr).split(':').map(Number);
  if (!y || !m || !d || isNaN(H) || isNaN(Mi)) return null;
  // UTC para evitar corrimientos por timezone
  return new Date(Date.UTC(y, (m - 1), d, H, Mi, 0, 0));
}

// GET /api/citas/horas?agenteEmail=...&fecha=YYYY-MM-DD
exports.getHorasDisponibles = async (req, res) => {
  try {
    const { agenteEmail, fecha } = req.query;
    if (!agenteEmail || !fecha) {
      return res.status(400).json({ msg: 'Faltan agenteEmail o fecha' });
    }

    // agenda base 09:00 - 18:00 cada hora
    const base = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];

    // citas del día para ese agente
    const start = new Date(`${fecha}T00:00:00.000Z`);
    const end   = new Date(`${fecha}T23:59:59.999Z`);

    const ocupadas = await Cita.find({
      agenteEmail,
      fecha: { $gte: start, $lte: end }
    }).select('hora -_id');

    const horasOcupadas = new Set(ocupadas.map(c => c.hora));
    const libres = base.filter(h => !horasOcupadas.has(h));

    return res.json({ horas: libres });
  } catch (e) {
    console.error('getHorasDisponibles error:', e);
    res.status(500).json({ msg: 'Error obteniendo horas' });
  }
};

// GET /api/citas?agenteEmail=...
exports.listarCitasPorAgente = async (req, res) => {
  try {
    const { agenteEmail } = req.query;
    if (!agenteEmail) return res.status(400).json({ msg: 'Falta agenteEmail' });

    const citas = await Cita.find({ agenteEmail }).sort({ fecha: 1, hora: 1 });
    res.json(citas);
  } catch (e) {
    console.error('listarCitasPorAgente error:', e);
    res.status(500).json({ msg: 'Error listando citas' });
  }
};

// POST /api/citas
exports.crearCita = async (req, res) => {
  try {
    const {
      seguimientoId,
      propiedadId,
      propiedadClave,
      agenteEmail,
      agenteNombre,
      clienteEmail,
      clienteNombre,
      tipoCliente,
      tipoOperacion,
      tipoEvento,
      fecha, 
      hora   
    } = req.body;

    if (!seguimientoId || !propiedadId || !agenteEmail || !clienteEmail || !tipoOperacion || !fecha || !hora) {
      return res.status(400).json({ msg: 'Campos obligatorios faltantes' });
    }

    const fechaReal = parseFechaHora(fecha, hora);
    if (!fechaReal || isNaN(fechaReal.getTime())) {
      return res.status(400).json({ msg: 'Fecha u hora inválida' });
    }

    // 🛑 Verificación de solapamiento
    const yaExiste = await Cita.findOne({ agenteEmail, fecha: fechaReal, hora });
    if (yaExiste) return res.status(409).json({ msg: 'El agente ya tiene una cita en esa hora' });

    // ✅ Crear cita con campos completos
    const cita = await Cita.create({
      seguimientoId,
      propiedadId,
      propiedadClave: propiedadClave || "",
      agenteEmail,
      agenteNombre: agenteNombre || "",
      clienteEmail,
      clienteNombre: clienteNombre || "",
      tipoCliente: tipoCliente || "",
      tipoOperacion,
      tipoEvento: tipoEvento || "Recorrido",
      fecha: fechaReal,
      hora
    });

    // ✅ Actualizar seguimiento
    await Seguimiento.findByIdAndUpdate(seguimientoId, {
      fechaCita: fechaReal,
      estatus: "Cita programada"
    });

    res.json({ ok: true, cita });

  } catch (err) {
    console.error("crearCita error:", err);
    res.status(500).json({ msg: "Error al crear cita" });
  }
};

exports.obtenerCitasPorAgente = async (req, res) => {
  try {
    const { agenteEmail } = req.params;

    const citas = await Cita.find({ agenteEmail })
      .populate("propiedadId", "clave imagenes")  // ✅ Trae imagen y clave
      .lean();

    const citasFormateadas = citas.map(c => ({
      ...c,
      propiedadClave: c.propiedadId?.clave || c.propiedadClave || "",
      propiedadImagen: c.propiedadId?.imagenes?.[0] || "", 
    }));

    res.json(citasFormateadas);
  } catch (err) {
    console.error("Error obtener citas:", err);
    res.status(500).json({ msg: "Error obteniendo citas" });
  }
};
