const sharp = require("sharp");
const axios = require("axios");

async function aplicarMarcaAgua(bufferImagen, watermarkUrl) {
  try {
    if (!watermarkUrl) return bufferImagen;

    const response = await axios.get(watermarkUrl, {
      responseType: "arraybuffer",
    });

    const watermarkBuffer = Buffer.from(response.data);

    const imagenFinal = await sharp(bufferImagen)
      .composite([
        {
          input: watermarkBuffer,
          gravity: "southeast",
          blend: "overlay",
        },
      ])
      .jpeg({ quality: 90 })
      .toBuffer();

    return imagenFinal;
  } catch (err) {
    console.error("Error aplicando watermark:", err);
    return bufferImagen;
  }
}

module.exports = { aplicarMarcaAgua };
