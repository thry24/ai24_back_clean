const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = [".jpg", ".jpeg", ".png"];

  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Solo imágenes JPG o PNG"), false);
  }
};

const limits = {
  fileSize: 20 * 1024 * 1024,
};

const uploadLogo = multer({
  storage,
  fileFilter,
  limits,
}).single("logo");

module.exports = uploadLogo;
