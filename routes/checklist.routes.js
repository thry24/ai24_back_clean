const express = require('express');
const router = express.Router();
const ChecklistDocumento = require('../models/ChecklistDocumento');

router.get('/public/:token', async (req, res) => {
  const checklist = await ChecklistDocumento.findOne({
    tokenAcceso: req.params.token
  });
  if (!checklist) return res.status(404).json({ message: 'Token inválido' });
  res.json(checklist);
});

module.exports = router;
