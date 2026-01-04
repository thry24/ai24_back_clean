const Seguimiento = require('../models/Seguimiento');

async function crearSeguimientoSiNoExiste({
  clienteEmail,
  clienteNombre,
  agenteEmail,
  tipoCliente = 'lead',
  tipoOperacion = null,
  propiedadId = null,
  origen = 'mensajes',
}) {
  if (!clienteEmail || !agenteEmail) {
    console.warn('⚠️ Seguimiento NO creado (emails inválidos)', {
      clienteEmail,
      agenteEmail,
    });
    return null;
  }

  let seg = await Seguimiento.findOne({ clienteEmail, agenteEmail });

  if (!seg) {
    seg = await Seguimiento.create({
      clienteEmail,
      clienteNombre: clienteNombre || 'Cliente',
      agenteEmail,
      tipoCliente,
      tipoOperacion,
      propiedadId,
      origen,
      fechaPrimerContacto: new Date(),
    });

    console.log('✅ Seguimiento creado:', {
      clienteEmail,
      agenteEmail,
    });
  } else {
    console.log('ℹ️ Seguimiento ya existía:', {
      clienteEmail,
      agenteEmail,
    });
  }

  return seg;
}

module.exports = crearSeguimientoSiNoExiste;
