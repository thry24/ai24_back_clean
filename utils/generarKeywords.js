function generarKeywords(tipo, caracteristicas) {
  const grupo = tipo === 'casa' || tipo === 'departamento' ? 'casaDepto' : tipo;
  const data = caracteristicas?.[grupo] || {};
  const keywords = [];

  const frases = {
    habitaciones: v => `${v} recámara${v > 1 ? 's' : ''}`,
    recamaraPB: v => v ? 'Recámara en planta baja' : '',
    banosCompletos: v => `${v} baño${v > 1 ? 's' : ''} completo${v > 1 ? 's' : ''}`,
    mediosBanos: v => `${v} medio baño${v > 1 ? 's' : ''}`,
    estacionamiento: v => `${v} cajón${v > 1 ? 'es' : ''} de estacionamiento`,
    closetVestidor: v => v ? 'Clóset vestidor' : '',
    superficie: v => `Superficie de ${v} m²`,
    construccion: v => `Construcción de ${v} m²`,
    pisos: v => `${v} piso${v > 1 ? 's' : ''}`,
    cocina: v => v ? `Cocina tipo ${v}` : '',
    barraDesayunador: v => v ? 'Barra desayunador' : '',
    balcon: v => v ? 'Balcón' : '',
    salaTV: v => v ? 'Sala de TV' : '',
    estudio: v => v ? 'Estudio' : '',
    areaLavado: v => v ? 'Área de lavado' : '',
    cuartoServicio: v => v ? 'Cuarto de servicio' : '',
    sotano: v => v ? 'Sótano' : '',
    jardin: v => v ? 'Jardín' : '',
    terraza: v => v ? 'Terraza' : '',
    m2Frente: v => `Frente de ${v} m`,
    m2Fondo: v => `Fondo de ${v} m`,
    tipo: v => `Tipo: ${v}`,
    costoXM2: v => `Costo por m²: ${v}`,
    kmz: v => v ? 'Incluye archivo KMZ' : '',
    agua: v => v ? 'Con agua' : '',
    luz: v => v ? 'Con luz' : '',
    drenaje: v => v ? 'Con drenaje' : '',
    plaza: v => `Ubicado en plaza ${v}`,
    planta: v => `Planta ${v}`,
    oficinas: v => `${v} oficina${v > 1 ? 's' : ''}`,
    banos: v => `${v} baño${v > 1 ? 's' : ''}`,
    salaJuntas: v => `${v} sala${v > 1 ? 's' : ''} de juntas`,
    privados: v => `${v} privado${v > 1 ? 's' : ''}`,
    comedores: v => v ? 'Comedor disponible' : '',
    empleados: v => `${v} empleados`,
    hectareas: v => `${v} hectárea${v > 1 ? 's' : ''}`,
    resistenciaPiso: v => `Piso con resistencia de ${v}`,
    cargaElectrica: v => `Carga eléctrica: ${v}`,
    kva: v => `${v} KVA`,
    estacionamientos: v => `${v} lugar${v > 1 ? 'es' : ''} de estacionamiento`
  };

  for (const key in data) {
    const valor = data[key];
    if (valor || typeof valor === 'number') {
      const frase = frases[key] ? frases[key](valor) : '';
      if (frase) keywords.push(frase);
    }
  }

  return keywords;
}

module.exports = generarKeywords;
