const Notificacion = require('../models/Notificacion');

exports.obtenerNotificaciones = async (req, res) => {
  const { email } = req.params;

  const notifs = await Notificacion.find({ usuarioEmail: email })
    .sort({ createdAt: -1 });

  res.json(notifs);
};

exports.marcarLeida = async (req, res) => {
  const { id } = req.params;
  await Notificacion.findByIdAndUpdate(id, { leida: true });
  res.json({ ok: true });
};
