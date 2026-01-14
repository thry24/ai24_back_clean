const express = require("express");
const multer = require("multer");
const { subirBufferAGoogleStorage } = require("../utils/uploadToGCS");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/imagen", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se envió archivo" });
    }

    const result = await subirBufferAGoogleStorage(
      req.file.buffer,
      req.file.originalname,
      "inmobiliarias"
    );

    res.json(result); // { url, public_id }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error subiendo imagen" });
  }
});

module.exports = router;
