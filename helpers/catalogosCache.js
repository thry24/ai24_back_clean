const fs = require('fs');
const path = require('path');

// 📍 ARCHIVO CORRECTO (SEPOMEX)
const FILE = path.join(
  __dirname,
  '../data/sepomex/estados-municipios-colonias.json'
);

let cache = null;

// 🔧 NORMALIZADOR ÚNICO (usar en rutas también)
const normalizar = (str = '') =>
  decodeURIComponent(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/**
 * 📦 Carga y cachea:
 * {
 *   estado: {
 *     municipio: [colonias]
 *   }
 * }
 */
function cargarCatalogosColonias() {
  if (cache) return cache;

  if (!fs.existsSync(FILE)) {
    throw new Error('❌ No existe estados-municipios-colonias.json');
  }

  const raw = fs.readFileSync(FILE, 'utf8');
  const json = JSON.parse(raw);

  /**
   * 🔥 Normalizamos TODO una sola vez:
   * - estados
   * - municipios
   */
  cache = Object.entries(json).reduce((accEstados, [estado, municipios]) => {
    const estadoKey = normalizar(estado);
    accEstados[estadoKey] = {};

    Object.entries(municipios).forEach(([municipio, colonias]) => {
      const municipioKey = normalizar(municipio);
      accEstados[estadoKey][municipioKey] = colonias;
    });

    return accEstados;
  }, {});

  return cache;
}

module.exports = {
  cargarCatalogosColonias,
  normalizar
};
