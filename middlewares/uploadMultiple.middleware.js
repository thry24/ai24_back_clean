const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = [".jpg", ".jpeg", ".png", ".pdf", ".kmz", ".zip", ".webp"];
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Archivo no permitido. Solo JPG, PNG, PDF, KMZ o ZIP."), false);
  }
};

const limits = {
  fileSize: 20 * 1024 * 1024, 
};

const upload = multer({ storage, fileFilter, limits });

const uploadMultiple = upload.fields([
  { name: "imagenes", maxCount: 11 },
  { name: "imagenPrincipal", maxCount: 1 },
  { name: "archivos", maxCount: 5 }
]);

module.exports = (req, res, next) => {
  uploadMultiple(req, res, function (err) {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ msg: "Uno de los archivos supera el tamaño máximo de 20 MB." });
    } else if (err) {
      return res.status(400).json({ msg: `${err.message}` });
    }
    next();
  });
};
