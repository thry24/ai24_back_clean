// controllers/seguimiento.logic.js

function resolverTipoOperacion({ tipoCliente, propiedadTipoOperacion }) {
  const tc = (tipoCliente || '').toLowerCase();

  if (tc.includes('arrendat')) return 'RENTA';
  if (tc.includes('compr')) return 'VENTA';

  // caso especial: si es agente, usa la propiedad si no es VENTA/RENTA
  if (tc.includes('agente')) {
    if (propiedadTipoOperacion === 'VENTA') return 'VENTA';
    if (propiedadTipoOperacion === 'RENTA') return 'RENTA';
    return '';
  }

  return '';
}

function calcularEstatus(seg) {
  const op = (seg.tipoOperacion || '').toUpperCase();

  if (seg.estadoFinal === 'GANADO') return 'Cerrado - Ganado';
  if (seg.estadoFinal === 'PERDIDO') return 'Cerrado - Perdido';

  if (op === 'VENTA') {
    if (seg.fechaFirma) return 'Firma completada';
    if (seg.fechaNotaria) return 'Notaría programada';
    if (seg.docsCompletos) return 'Documentación completa';
    if (seg.fechaCarta) return 'Carta intención generada';
    if (seg.fechaRecorrido) return 'Recorrido programado';
    if (seg.fechaCita) return 'Cita agendada';
    return 'Primer contacto';
  }

  if (op === 'RENTA') {
    if (seg.fechaFirmaArr) return 'Contrato firmado';
    if (seg.fechaBorradorArr) return 'Borrador de contrato';

    if (seg.recorridoNoSeDio) {
      if (seg.fechaSegundoRecorrido) return 'Segundo recorrido programado';
      if (seg.fechaSegundaRetroalimentacion) return 'Segunda retroalimentación';
      return 'Recorrido no efectivo';
    }

    if (seg.documentosCompletos) return 'Documentación completa';
    if (seg.fechaCartaOferta) return 'Carta oferta generada';
    if (seg.fechaRecorrido) return 'Recorrido programado';
    if (seg.fechaCita) return 'Cita agendada';
    return 'Primer contacto';
  }

  return 'En proceso';
}

function aplicarCierreAutomatico(seg) {
  const now = new Date();
  const op = (seg.tipoOperacion || '').toUpperCase();

  // GANADO automático por firma
  if (op === 'VENTA' && seg.fechaFirma) {
    seg.estadoFinal = 'GANADO';
    seg.fechaCierre = seg.fechaCierre || now;
    seg.estatus = 'Cerrado - Ganado';
  }
  if (op === 'RENTA' && seg.fechaFirmaArr) {
    seg.estadoFinal = 'GANADO';
    seg.fechaCierre = seg.fechaCierre || now;
    seg.estatus = 'Cerrado - Ganado';
  }
}

module.exports = { resolverTipoOperacion, calcularEstatus, aplicarCierreAutomatico };
