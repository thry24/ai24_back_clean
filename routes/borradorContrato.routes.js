const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const { enviarBorradorContrato } = require('../controllers/borradorContrato.controller');

router.post('/', verifyToken, enviarBorradorContrato);

module.exports = router;
