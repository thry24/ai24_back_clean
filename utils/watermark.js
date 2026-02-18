const sharp = require("sharp");
const axios = require("axios");

async function aplicarMarcaAgua(bufferImagen, watermarkUrl) {
  try {

    // 1️⃣ Metadata imagen
    const metadata = await sharp(bufferImagen).metadata();
    const anchoImagen = metadata.width;

    // 2️⃣ Descargar watermark
    const response = await axios.get(watermarkUrl, {
      responseType: "arraybuffer"
    });

    let watermarkBuffer = Buffer.from(response.data);

    // 3️⃣ Convertir a PNG + quitar fondo blanco + bajar opacidad
    watermarkBuffer = await sharp(watermarkBuffer)
      .png()
      .threshold(240)   // detecta blancos
      .ensureAlpha(0.18)
      .toBuffer();


    // 4️⃣ Redimensionar proporcional
    const anchoWatermark = Math.min(
      Math.floor(anchoImagen * 0.28),
      350
    );

    const watermarkResize = await sharp(watermarkBuffer)
      .resize({ width: anchoWatermark })
      .blur(0.3)                  // 👈 difuminado leve
      .toBuffer();

    // 5️⃣ Componer
    const imagenFinal = await sharp(bufferImagen)
      .composite([
        {
          input: watermarkResize,
          gravity: "center",
          blend: "over"
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