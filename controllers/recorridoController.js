const Recorrido = require('../models/Recorrido');

/* =========================
   📌 CREAR NUEVO RECORRIDO
========================= */
exports.crear = async (req, res) => {
  try {
    const nuevo = new Recorrido(req.body);
    await nuevo.save();

    res.json({ ok: true, recorrido: nuevo });
  } catch (err) {
    console.error('❌ Error al crear recorrido:', err);
    res.status(500).json({
      ok: false,
      message: 'Error al guardar el recorrido',
    });
  }
};

/* =========================
   📌 OBTENER RECORRIDOS POR AGENTE
========================= */
exports.obtenerPorAgente = async (req, res) => {
  try {
    const email = (req.params.email || '').toLowerCase();

    if (!email) {
      return res.status(400).json({ ok: false, message: 'Falta el email del agente' });
    }

    const recorridos = await Recorrido.find({ agenteEmail: email })
      .populate('propiedadId', 'clave tipoPropiedad direccion')
      .populate('seguimientoId', 'clienteNombre clienteEmail tipoOperacion estatus')
      .sort({ fecha: -1 });

    res.json(recorridos);
  } catch (err) {
    console.error('❌ Error al obtener recorridos:', err);
    res.status(500).json({
      ok: false,
      message: 'Error al obtener recorridos',
    });
  }
};

/* =========================
   📌 ELIMINAR RECORRIDO
========================= */
exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    await Recorrido.findByIdAndDelete(id);

    res.json({ ok: true, message: 'Recorrido eliminado correctamente' });
  } catch (err) {
    console.error('❌ Error al eliminar recorrido:', err);
    res.status(500).json({ ok: false, message: 'Error al eliminar recorrido' });
  }
};

/* =========================
   📌 EDITAR RECORRIDO
========================= */
exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const recorrido = await Recorrido.findByIdAndUpdate(id, req.body, { new: true });

    res.json({ ok: true, recorrido });
  } catch (err) {
    console.error('❌ Error al actualizar recorrido:', err);
    res.status(500).json({ ok: false, message: 'Error al actualizar recorrido' });
  }
};
