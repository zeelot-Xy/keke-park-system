const multer = require("multer");

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files allowed"), false);
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

module.exports = upload;
