const Seguimiento = require('../models/Seguimiento');

async function crearSeguimientoSiNoExiste({
  clienteEmail,
  clienteNombre,
  agenteEmail,
  tipoCliente,
  tipoOperacion,
  propiedadId,
  origen,
}) {
  if (!clienteEmail || !agenteEmail) return null;

  let seg = await Seguimiento.findOne({
    clienteEmail,
    agenteEmail,
    propiedadId,
  });

  if (seg) return seg;

  seg = await Seguimiento.create({
    clienteEmail: clienteEmail.toLowerCase().trim(),
    clienteNombre: clienteNombre || 'Cliente',
    agenteEmail: agenteEmail.toLowerCase().trim(),

    tipoCliente: tipoCliente || 'Sin definir',
    tipoOperacion: (tipoOperacion || '').toUpperCase(),

    propiedadId,

    origen: (origen || 'EMAIL').toUpperCase(),

    // 🔴 CAMPOS CLAVE QUE FALTABAN
    estatus: 'En proceso',
    estadoFinal: 'EN PROCESO',

    docsCompletos: false,
    documentosCompletos: false,

    fechaPrimerContacto: new Date(),
  });

  return seg;
}

module.exports = { crearSeguimientoSiNoExiste };
