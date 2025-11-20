const { Storage } = require("@google-cloud/storage");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
require("dotenv").config();

// =============================================
// 🔥 Cargar credenciales desde variable de entorno
// =============================================
let serviceAccount = null;

try {
  serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_KEY);

  // Reemplazar saltos de línea escapados en private_key
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }
} catch (err) {
  console.error("❌ ERROR: GOOGLE_SERVICE_KEY no es un JSON válido.");
  console.error(err);
}

// =============================================
// 🚀 Inicializar Google Cloud Storage
// =============================================
const storage = new Storage({
  credentials: serviceAccount,
});

const bucketName = process.env.GCLOUD_BUCKET_NAME;
const bucket = storage.bucket(bucketName);

// =============================================
// 📌 Subir archivo desde ruta local
// =============================================
async function subirAGoogleStorage(filePath, folder = "uploads") {
  return new Promise((resolve, reject) => {
    const fileName = path.basename(filePath);
    const destination = `${folder}/${Date.now()}_${fileName}`;
    const fileUpload = bucket.file(destination);

    const stream = fileUpload.createWriteStream({
      resumable: false,
      metadata: { contentType: "auto" },
    });

    stream.on("error", (err) => reject(err));

    stream.on("finish", async () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
      resolve({ url: publicUrl, public_id: destination });
    });

    fs.createReadStream(filePath).pipe(stream);
  });
}

// =============================================
// 📌 Subir archivo desde Buffer (firma base64, etc.)
// =============================================
async function subirBufferAGoogleStorage(buffer, filename, folder = "uploads") {
  return new Promise((resolve, reject) => {
    const extension = path.extname(filename) || ".png";
    const uniqueName = `${folder}/${Date.now()}_${uuidv4()}${extension}`;
    const file = bucket.file(uniqueName);

    const stream = file.createWriteStream({
      resumable: false,
      metadata: { contentType: "image/png" },
    });

    stream.on("error", reject);

    stream.on("finish", () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${uniqueName}`;
      resolve({ url: publicUrl, public_id: uniqueName });
    });

    stream.end(buffer);
  });
}

// =============================================
// 📌 Eliminar archivo del bucket
// =============================================
async function eliminarDeGoogleStorage(publicId) {
  try {
    const file = bucket.file(publicId);
    await file.delete();
    console.log(`✔ Archivo eliminado: ${publicId}`);
  } catch (error) {
    console.error("❌ Error al eliminar de Google Storage:", error.message);
  }
}

module.exports = {
  subirAGoogleStorage,
  subirBufferAGoogleStorage,
  eliminarDeGoogleStorage,
};
