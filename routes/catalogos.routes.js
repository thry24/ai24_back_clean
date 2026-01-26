const express = require('express');
const router = express.Router();
const { cargarCatalogosColonias } = require('../helpers/catalogosCache');

// 🔧 normalizador universal (acentos, espacios, URL)
const normalizar = (str = '') =>
  decodeURIComponent(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/**
 * 🌎 PAISES
 */
router.get('/paises', (_req, res) => {
  res.json(['México']);
});

/**
 * 🗺️ ESTADOS
 */
router.get('/estados', (_req, res) => {
  const catalogos = cargarCatalogosColonias();
  res.json(Object.keys(catalogos));
});

/**
 * 🏘️ MUNICIPIOS POR ESTADO
 * /api/catalogos/municipios/:estado
 */
router.get('/municipios/:estado', (req, res) => {
  const { estado } = req.params;
  const catalogos = cargarCatalogosColonias();

  const estadoKey = Object.keys(catalogos).find(
    e => normalizar(e) === normalizar(estado)
  );

  if (!estadoKey) {
    return res.json([]);
  }

  res.json(Object.keys(catalogos[estadoKey]));
});

/**
 * 🧩 COLONIAS POR ESTADO + MUNICIPIO
 * /api/catalogos/colonias/:estado/:municipio
 */
router.get('/colonias/:estado/:municipio', (req, res) => {
  const { estado, municipio } = req.params;
  const catalogos = cargarCatalogosColonias();

  const estadoKey = Object.keys(catalogos).find(
    e => normalizar(e) === normalizar(estado)
  );

  if (!estadoKey) return res.json([]);

  const municipioKey = Object.keys(catalogos[estadoKey]).find(
    m => normalizar(m) === normalizar(municipio)
  );

  if (!municipioKey) return res.json([]);

  res.json(catalogos[estadoKey][municipioKey]);
});

module.exports = router;
