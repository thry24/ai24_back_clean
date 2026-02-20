const sharp = require("sharp");
const axios = require("axios");

async function aplicarMarcaAgua(bufferImagen, watermarkUrl) {
  try {
    const { width } = await sharp(bufferImagen).metadata();

    const response = await axios.get(watermarkUrl, {
      responseType: "arraybuffer"
    });

    const logoBuffer = Buffer.from(response.data);

    const logoWidth = Math.floor(width * 0.30); // un poco más pequeño

    const logoResize = await sharp(logoBuffer)
      .resize({ width: logoWidth })
      .toBuffer();

    const imagenFinal = await sharp(bufferImagen)
      .composite([
        {
          input: logoResize,
          gravity: "center",
          blend: "multiply", // 🔥 ESTA ES LA CLAVE
        }
      ])
      .jpeg({ quality: 95 })
      .toBuffer();

    return imagenFinal;

  } catch (error) {
    console.error("Error aplicando marca de agua:", error);
    return bufferImagen;
  }
}

module.exports = { aplicarMarcaAgua };
