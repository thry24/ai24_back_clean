const cloudinary = require("../config/cloudinary");
const fs = require("fs");

const subirACloudinary = async (pathArchivo, carpeta = "ai24-temp") => {
  const res = await cloudinary.uploader.upload(pathArchivo, {
    folder: carpeta,
  });
  fs.unlinkSync(pathArchivo);
  return { url: res.secure_url, public_id: res.public_id };
};

const eliminarDeCloudinary = async (public_id) => {
  return await cloudinary.uploader.destroy(public_id);
};

module.exports = { subirACloudinary, eliminarDeCloudinary };
