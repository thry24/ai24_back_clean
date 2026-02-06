require("dotenv").config();
const mongoose = require("mongoose");
const Property = require("../models/Propiedad");

const BUCKET = process.env.GCLOUD_BUCKET_NAME;
const MONGO_URI = process.env.MONGODB_URI; // OJO AQUÍ

async function fixImages() {
  if (!MONGO_URI) {
    throw new Error("❌ MONGODB_URI no está definida");
  }

  await mongoose.connect(MONGO_URI);
  console.log("✅ Mongo conectado");

  const propiedades = await Property.find({ "media.images.0": { $exists: true } });

  for (const prop of propiedades) {
    prop.media.images = prop.media.images.map((img) => {
      if (!img.public_id) return img;

      return {
        ...img.toObject(),
        url: `https://storage.googleapis.com/${BUCKET}/${img.public_id}`,
      };
    });

    await prop.save();
    console.log("✔ actualizado:", prop._id.toString());
  }

  console.log("🎉 TODAS LAS IMÁGENES ACTUALIZADAS");
  process.exit(0);
}

fixImages().catch((err) => {
  console.error(err);
  process.exit(1);
});
