const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '../data/sepomex/CPdescarga.txt');
const OUTPUT = path.join(__dirname, '../data/sepomex/estados-municipios-colonias.json');

function limpiar(texto) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function generar() {
  if (!fs.existsSync(INPUT)) {
    console.error('❌ No se encontró CPdescarga.txt');
    process.exit(1);
  }

  const data = fs.readFileSync(INPUT, 'latin1');
  const lineas = data.split('\n').slice(2); // saltar encabezados

  const resultado = {};

  for (const linea of lineas) {
    const cols = linea.split('|');

    const colonia = cols[1]?.trim();
    const municipio = cols[3]?.trim();
    const estado = cols[4]?.trim();

    if (!estado || !municipio || !colonia) continue;

    if (!resultado[estado]) resultado[estado] = {};
    if (!resultado[estado][municipio]) resultado[estado][municipio] = [];

    resultado[estado][municipio].push(colonia);
  }

  // limpiar duplicados + ordenar
  for (const estado in resultado) {
    for (const municipio in resultado[estado]) {
      resultado[estado][municipio] = Array.from(
        new Set(resultado[estado][municipio])
      ).sort((a, b) =>
        a.localeCompare(b, 'es', { sensitivity: 'base' })
      );
    }
  }

  fs.writeFileSync(
    OUTPUT,
    JSON.stringify(resultado, null, 2),
    'utf8'
  );

  console.log('✅ estados-municipios-colonias.json generado');
  console.log(`📍 ${OUTPUT}`);
}

generar();
