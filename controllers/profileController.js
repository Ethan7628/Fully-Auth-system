const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Get user profile
db.getUserById = function (id, callback) {
  db.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
    if (err) return callback(err);
    callback(null, results[0]);
  });
};

const getProfile = (req, res) => {
  db.getUserById(req.user.id, (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({
      success: true,
      profile: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone_number: user.phone_number,
        bio: user.bio,
        profile_picture: user.profile_picture ? `/uploads/profiles/${path.basename(user.profile_picture)}` : null,
        status: user.status,
        last_seen: user.last_seen,
        is_verified: user.is_verified,
        created_at: user.created_at
      }
    });
  });
};

const updateProfile = (req, res) => {
  const { full_name, phone_number, bio, status } = req.body;
  const userId = req.user.id;
  let updateFields = [];
  let updateValues = [];
  if (full_name !== undefined) { updateFields.push('full_name = ?'); updateValues.push(full_name); }
  if (phone_number !== undefined) { updateFields.push('phone_number = ?'); updateValues.push(phone_number); }
  if (bio !== undefined) { updateFields.push('bio = ?'); updateValues.push(bio); }
  if (status !== undefined && ['online', 'offline', 'away'].includes(status)) { updateFields.push('status = ?'); updateValues.push(status); }
  if (updateFields.length === 0) {
    return res.status(400).json({ success: false, message: 'No fields to update' });
  }
  updateValues.push(userId);
  const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
  db.query(updateQuery, updateValues, (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
    res.json({ success: true, message: 'Profile updated successfully', updatedFields: updateFields.map(f => f.split(' = ')[0]) });
  });
};

const uploadProfilePicture = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const userId = req.user.id;
  const uploadedFilePath = req.file.path;
  try {
    const processedFileName = `processed-${req.file.filename}`;
    const processedFilePath = path.join(path.dirname(uploadedFilePath), processedFileName);
    await sharp(uploadedFilePath)
      .resize(300, 300)
      .jpeg({ quality: 80 })
      .toFile(processedFilePath);
    fs.unlinkSync(uploadedFilePath);
    db.query('SELECT profile_picture FROM users WHERE id = ?', [userId], (err, results) => {
      if (err) return res.status(500).json({ success: false, message: 'Internal server error' });
      const oldPicturePath = results[0]?.profile_picture;
      db.query('UPDATE users SET profile_picture = ? WHERE id = ?', [processedFilePath, userId], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Internal server error' });
        if (oldPicturePath && fs.existsSync(oldPicturePath)) {
          fs.unlinkSync(oldPicturePath);
        }
        res.json({ success: true, message: 'Profile picture updated successfully', profile_picture: `/uploads/profiles/${processedFileName}` });
      });
    });
  } catch (processingError) {
    if (fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
    return res.status(500).json({ success: false, message: 'Error processing image' });
  }
};

const deleteProfilePicture = (req, res) => {
  const userId = req.user.id;
  db.query('SELECT profile_picture FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Internal server error' });
    const picturePath = results[0]?.profile_picture;
    db.query('UPDATE users SET profile_picture = NULL WHERE id = ?', [userId], (err) => {
      if (err) return res.status(500).json({ success: false, message: 'Internal server error' });
      if (picturePath && fs.existsSync(picturePath)) {
        fs.unlinkSync(picturePath);
      }
      res.json({ success: true, message: 'Profile picture deleted successfully' });
    });
  });
};

module.exports = {
  getProfile,
  updateProfile,
  uploadProfilePicture,
  deleteProfilePicture
};
