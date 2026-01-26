/**
 * Genera estados-municipios.json desde CSV oficiales INEGI
 * Codificación correcta + parser real
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const DATA_DIR = path.join(__dirname, '../data/inegi');

const ENTIDADES_CSV = path.join(DATA_DIR, 'entidades.csv');
const MUNICIPIOS_CSV = path.join(DATA_DIR, 'municipios.csv');
const OUTPUT_JSON = path.join(DATA_DIR, 'estados-municipios.json');

function leerCSV(filePath) {
  const contenido = fs.readFileSync(filePath, 'latin1'); // 🔥 CLAVE

  return parse(contenido, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
}

function generar() {
  console.log('📥 Leyendo entidades...');
  const entidades = leerCSV(ENTIDADES_CSV);

  console.log('📥 Leyendo municipios...');
  const municipios = leerCSV(MUNICIPIOS_CSV);

  const estadosValidos = new Set(
    entidades.map(e => e.NOM_ENT).filter(Boolean)
  );

  const resultado = {};

  for (const m of municipios) {
    const estado = m.NOM_ENT;
    const municipio = m.NOM_MUN;

    if (!estado || !municipio) continue;
    if (!estadosValidos.has(estado)) continue;

    if (!resultado[estado]) resultado[estado] = [];
    resultado[estado].push(municipio);
  }

  // 🔠 ordenar municipios
  for (const estado in resultado) {
    resultado[estado] = Array.from(new Set(resultado[estado]))
      .sort((a, b) =>
        a.localeCompare(b, 'es', { sensitivity: 'base' })
      );
  }

  // 🔠 ordenar estados
  const ordenado = Object.keys(resultado)
    .sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    )
    .reduce((acc, estado) => {
      acc[estado] = resultado[estado];
      return acc;
    }, {});

  fs.writeFileSync(
    OUTPUT_JSON,
    JSON.stringify(ordenado, null, 2),
    'utf8'
  );

  console.log('✅ estados-municipios.json generado correctamente');
  console.log(`📍 ${OUTPUT_JSON}`);
}

generar();
