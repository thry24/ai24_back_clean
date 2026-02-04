const express = require('express');
const router = express.Router();

const {
  subirDocumento,
  validarDocumento,
  obtenerDocsCliente
} = require('../controllers/documentos.controller');

// 🔹 Cliente: ver sus documentos
router.get('/cliente/:email', obtenerDocsCliente);

// 🔹 Cliente: subir documento
router.put('/:id', subirDocumento);

// 🔹 Agente: validar documento
router.put('/validar/:id', validarDocumento);

// 🔹 Agente: enviar checklist (manual si lo necesitas)

module.exports = router;
