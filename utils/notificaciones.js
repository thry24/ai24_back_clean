const Notificacion = require('../models/Notificacion');

async function crearNotificacion({
  usuarioEmail,
  mensaje,
  tipo = 'contacto',
  referenciaId = null,
}) {
  if (!usuarioEmail || !mensaje) return;

  await Notificacion.create({
    usuarioEmail: usuarioEmail.toLowerCase(),
    mensaje,
    tipo,
    referenciaId,
  });
}

module.exports = { crearNotificacion };
