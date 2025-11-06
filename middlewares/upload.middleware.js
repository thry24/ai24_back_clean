const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = [".jpg", ".jpeg", ".png"];
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten imágenes JPG, JPEG o PNG."), false);
  }
};

const limits = {
  fileSize: 20 * 1024 * 1024,
};

const upload = multer({ storage, fileFilter, limits }).fields([
  { name: "file", maxCount: 1 },
  { name: "firmaBase64", maxCount: 1 },
]);

module.exports = (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ msg: "La imagen supera el límite de 20 MB." });
    } else if (err) {
      return res.status(400).json({ msg: `${err.message}` });
    }
    next();
  });
};
