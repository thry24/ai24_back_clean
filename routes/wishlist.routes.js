const express = require('express');
const router = express.Router();
const { verifyToken, tokenOpcional } = require('../middlewares/authMiddleware');
const controller = require('../controllers/wishlist.controller');
const { obtenerFavoritosClientePorAgente } = require("../controllers/wishlist.controller");

router.get("/cliente/:clienteEmail", verifyToken, obtenerFavoritosClientePorAgente);
router.post('/wishlist', verifyToken, controller.agregarAFavoritos);
router.delete('/wishlist/:propiedadId', verifyToken, controller.eliminarDeFavoritos);
router.get('/wishlist', tokenOpcional, controller.obtenerFavoritos);
router.get('/wishlist/cliente/me', verifyToken, controller.obtenerFavoritosClienteLogueado);

module.exports = router;
