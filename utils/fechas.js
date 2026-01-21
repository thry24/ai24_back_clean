exports.obtenerDiaSemana = (fecha) => {
  const dias = [
    'domingo','lunes','martes','miércoles',
    'jueves','viernes','sábado'
  ];
  return dias[new Date(fecha).getDay()];
};
