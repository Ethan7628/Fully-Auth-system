const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads/profiles');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}


// File filter must be defined before use
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed!'), false);
};

// For registration, user is not yet created, so use email+timestamp
const regStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const email = req.body.email ? req.body.email.replace(/[^a-zA-Z0-9]/g, '') : 'nouser';
    cb(null, email + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadForRegister = multer({
  storage: regStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.user && req.user.id ? req.user.id + '-' + uniqueSuffix + path.extname(file.originalname) : 'nouser-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = upload;
module.exports.uploadForRegister = uploadForRegister;
