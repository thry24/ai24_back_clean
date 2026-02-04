const Notificacion = require('../models/Notificacion');

async function crearNotificacion(data) {
  try {
    if (!data?.usuarioEmail || !data?.mensaje) {
      console.warn('⚠️ Notificación incompleta:', data);
      return;
    }

    const notif = await Notificacion.create({
      usuarioEmail: data.usuarioEmail.toLowerCase(),
      mensaje: data.mensaje,
      tipo: data.tipo || 'contacto',
      referenciaId: data.referenciaId || null,
      meta: data.meta || {}
    });

    console.log('🔔 Notificación guardada:', notif._id);
    return notif;

  } catch (err) {
    console.error('❌ Error creando notificación:', err.message);
  }
}

module.exports = { crearNotificacion };
