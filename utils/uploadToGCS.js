const { Storage } = require("@google-cloud/storage");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
require("dotenv").config();

// Construir credenciales desde variables de entorno GCLOUD_*
function getServiceAccountFromEnv() {
  const required = [
    "GCLOUD_PROJECT_ID",
    "GCLOUD_CLIENT_EMAIL",
    "GCLOUD_PRIVATE_KEY",
    "GCLOUD_BUCKET_NAME",
  ];

  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Faltan variables de entorno: ${missing.join(", ")}`);
  }

  return {
    type: process.env.GCLOUD_TYPE || "service_account",
    project_id: process.env.GCLOUD_PROJECT_ID,
    private_key_id: process.env.GCLOUD_PRIVATE_KEY_ID,
    private_key: process.env.GCLOUD_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.GCLOUD_CLIENT_EMAIL,
    client_id: process.env.GCLOUD_CLIENT_ID,
    auth_uri: process.env.GCLOUD_AUTH_URI,
    token_uri: process.env.GCLOUD_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GCLOUD_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.GCLOUD_CLIENT_X509_CERT_URL,
    universe_domain: process.env.GCLOUD_UNIVERSE_DOMAIN,
  };
}

// Inicializar Google Cloud Storage
let bucket = null;

try {
  const serviceAccount = getServiceAccountFromEnv();

  const storage = new Storage({
    projectId: serviceAccount.project_id,
    credentials: serviceAccount,
  });

  bucket = storage.bucket(process.env.GCLOUD_BUCKET_NAME);
} catch (err) {
  console.error("❌ Error inicializando Google Cloud Storage:");
  console.error(err.message);
}

function ensureBucket() {
  if (!bucket) {
    throw new Error(
      "Bucket no inicializado. Revisa credenciales GCLOUD_* y dotenv."
    );
  }
}

// Subir archivo desde ruta local
async function subirAGoogleStorage(filePath, folder = "uploads") {
  ensureBucket();

  const fileName = path.basename(filePath);
  const destination = `${folder}/${Date.now()}_${fileName}`;
  const fileUpload = bucket.file(destination);

  await bucket.upload(filePath, {
    destination,
    resumable: false,
    metadata: { contentType: "auto" },
  });

  // Generar signed URL en lugar de makePublic
  const [url] = await fileUpload.getSignedUrl({
    action: "read",
    expires: Date.now() + 1000 * 60 * 60, // 1 hora de validez
  });

  return { url, public_id: destination };
}

// Subir archivo desde Buffer
async function subirBufferAGoogleStorage(buffer, filename, folder = "uploads") {
  ensureBucket();

  const extension = path.extname(filename) || ".png";
  const uniqueName = `${folder}/${Date.now()}_${uuidv4()}${extension}`;
  const file = bucket.file(uniqueName);

  await file.save(buffer, {
    resumable: false,
    contentType: "image/png",
  });

  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 1000 * 60 * 60, // 1 hora
  });

  return { url, public_id: uniqueName };
}

// Eliminar archivo del bucket
async function eliminarDeGoogleStorage(publicId) {
  ensureBucket();
  const file = bucket.file(publicId);
  await file.delete();
  console.log(`✔ Archivo eliminado: ${publicId}`);
}

module.exports = {
  subirAGoogleStorage,
  subirBufferAGoogleStorage,
  eliminarDeGoogleStorage,
};
