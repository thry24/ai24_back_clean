const { Storage } = require("@google-cloud/storage");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
require("dotenv").config();

const storage = new Storage({
  keyFilename: path.join(__dirname, "../config/gleaming-plate-461914-i1-da1908c2933d.json"),
});

const bucketName = process.env.GCLOUD_BUCKET_NAME;
const bucket = storage.bucket(bucketName);

/**
 * Sube un archivo local a GCS
 * @param {string} filePath Ruta del archivo local (ej. './uploads/temp.jpg')
 * @param {string} folder Carpeta dentro del bucket (ej. 'ai24/agentes')
 * @returns {Promise<{ url: string, public_id: string }>}
 */
async function subirAGoogleStorage(filePath, folder = "uploads") {
  return new Promise((resolve, reject) => {
    const fileName = path.basename(filePath);
    const destination = `${folder}/${Date.now()}_${fileName}`;
    const fileUpload = bucket.file(destination);

    const stream = fileUpload.createWriteStream({
      resumable: false,
      metadata: {
        contentType: "auto",
      },
    });

    stream.on("error", (err) => reject(err));

    stream.on("finish", async () => {
      try {
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
        resolve({ url: publicUrl, public_id: destination });
      } catch (err) {
        reject(err);
      }
    });

    fs.createReadStream(filePath).pipe(stream);
  });
}

/**
 * Sube un buffer (por ejemplo, base64 convertido) directamente a GCS
 * @param {Buffer} buffer
 * @param {string} filename Nombre original o sugerido (ej. 'firma.png')
 * @param {string} folder Carpeta en el bucket (ej. 'ai24/firmas')
 * @returns {Promise<{ url: string, public_id: string }>}
 */
async function subirBufferAGoogleStorage(buffer, filename, folder = "uploads") {
  return new Promise((resolve, reject) => {
    const extension = path.extname(filename) || ".png";
    const uniqueName = `${folder}/${Date.now()}_${uuidv4()}${extension}`;
    const file = bucket.file(uniqueName);

    const stream = file.createWriteStream({
      resumable: false,
      metadata: {
        contentType: "image/png",
      },
    });

    stream.on("error", reject);

    stream.on("finish", () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${uniqueName}`;
      resolve({ url: publicUrl, public_id: uniqueName });
    });

    stream.end(buffer);
  });
}

/**
 * Elimina un archivo del bucket de Google Cloud Storage
 * @param {string} publicId Ruta del archivo en el bucket (ej. 'ai24/agentes/1719293091234_foto.jpg')
 */
async function eliminarDeGoogleStorage(publicId) {
  try {
    const file = bucket.file(publicId);
    await file.delete();
    console.log(`Archivo eliminado: ${publicId}`);
  } catch (error) {
    console.error("Error al eliminar de Google Storage:", error.message);
  }
}

module.exports = {
  subirAGoogleStorage,
  subirBufferAGoogleStorage,
  eliminarDeGoogleStorage,
};
