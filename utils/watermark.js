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

    let watermarkBuffer = Buffer.from(response.data);

    // 3️⃣ Convertir watermark a PNG (para respetar transparencias)
    watermarkBuffer = await sharp(watermarkBuffer)
      .png()
      .toBuffer();

    // 4️⃣ Redimensionar watermark proporcionalmente
    const anchoWatermark = Math.min(
      Math.floor(anchoImagen * 0.25), // 25% del ancho
      300
    );

    const watermarkResize = await sharp(watermarkBuffer)
      .resize({ width: anchoWatermark })
      .toBuffer();

    // 5️⃣ Componer imagen con marca centrada
    const imagenFinal = await sharp(bufferImagen)
      .composite([
        {
          input: watermarkResize,
          gravity: "center",   // 👈 AQUÍ va centrado
          blend: "over",
          opacity: 0.35        // 👈 transparencia real
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
