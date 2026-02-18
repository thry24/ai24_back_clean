// routes/chatbot.routes.js
const router = require("express").Router();
const ctrl = require("../controllers/chatBot.controller");
const botSearch = require("../controllers/botSearch.controller");

router.post("/start", ctrl.startConversation);     // crea lead + conversation
router.post("/reply", ctrl.reply);                 // recibe respuesta y regresa siguiente pregunta
router.post("/search-properties", botSearch.searchPropertiesForBot);
module.exports = router;
