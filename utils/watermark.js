const sharp = require("sharp");
const axios = require("axios");

async function aplicarMarcaAgua(bufferImagen, watermarkUrl) {
  try {

    // 1️⃣ Obtener tamaño de la imagen
    const metadata = await sharp(bufferImagen).metadata();
    const anchoImagen = metadata.width;

    // 2️⃣ Descargar watermark
    const response = await axios.get(watermarkUrl, {
      responseType: "arraybuffer"
    });

    const watermarkBuffer = Buffer.from(response.data);

    // 3️⃣ Redimensionar watermark proporcionalmente
    const anchoWatermark = Math.min(
      Math.floor(anchoImagen * 0.18), // 18% del ancho
      220 // nunca más grande que esto
    );

    const watermarkResize = await sharp(watermarkBuffer)
      .resize({ width: anchoWatermark })
      .png()
      .toBuffer();

    // 4️⃣ Componer imagen
    const imagenFinal = await sharp(bufferImagen)
      .composite([
        {
          input: watermarkResize,
          gravity: "southeast"
        }
      ])
      .jpeg({ quality: 92 })
      .toBuffer();

    return imagenFinal;

  } catch (error) {
    console.error("Error aplicando marca de agua:", error);
    return bufferImagen;
  }
}

module.exports = { aplicarMarcaAgua };
