const express = require('express');

const { signup, verifyOTP, login, getUsers } = require('../controllers/authController');
const { authenticateToken, authorizeRoles, authorizeSelf } = require('../middleware/authMiddleware');
const { uploadForRegister } = require('../middleware/uploadMiddleware');

const router = express.Router();

// Public routes
router.post('/signup', uploadForRegister.single('profile_picture'), signup);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
// /users route: admin only
router.get('/users', authenticateToken, authorizeRoles('admin'), getUsers);


// Protected route example
// /profile route: signed-in user only
router.get('/profile', authenticateToken, authorizeSelf, (req, res) => {
  res.json({
    message: 'Protected route accessed successfully',
    user: req.user
  });
});

module.exports = router;
