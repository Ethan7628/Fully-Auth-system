const express = require('express');
const { getProfile, updateProfile, uploadProfilePicture, deleteProfilePicture } = require('../controllers/profileController');
const { authenticateToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();
router.use(authenticateToken);

router.get('/', getProfile);
router.put('/', updateProfile);
router.post('/picture', upload.single('profile_picture'), uploadProfilePicture);
router.delete('/picture', deleteProfilePicture);

module.exports = router;
