const express = require("express");
const router = express.Router();
const authGoogle = require("../controllers/authGoogle.controller");

router.get('/auth/google/start', authGoogle.googleStart);
router.get('/auth/google/callback', authGoogle.googleCallback);

module.exports = router;
