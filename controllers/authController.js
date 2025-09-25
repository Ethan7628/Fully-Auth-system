const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { sendOTPEmail } = require('../utils/emailService');

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const signup = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Profile picture is required' });
    }
    const userRole = (role === 'admin' || role === 'staf') ? role : 'staf';

    const checkEmailQuery = 'SELECT id FROM users WHERE email = ?';
    db.query(checkEmailQuery, [email], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      if (results.length > 0) {
        // Delete uploaded file if email exists
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const otp = generateOTP();

      // Process image with sharp
      const processedFileName = `processed-${req.file.filename}`;
      const processedFilePath = path.join(path.dirname(req.file.path), processedFileName);
      try {
        await sharp(req.file.path)
          .resize(300, 300)
          .jpeg({ quality: 80 })
          .toFile(processedFilePath);
        fs.unlinkSync(req.file.path);
      } catch (err) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(500).json({ message: 'Error processing image' });
      }

      const insertQuery = `
        INSERT INTO users (email, password, role, otp, is_verified, profile_picture) 
        VALUES (?, ?, ?, ?, FALSE, ?)
      `;

      db.query(insertQuery, [email, hashedPassword, userRole, otp, processedFilePath], async (err, results) => {
        if (err) {
          if (fs.existsSync(processedFilePath)) fs.unlinkSync(processedFilePath);
          console.error('Database error:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }
        try {
          await sendOTPEmail(email, otp);
          res.status(201).json({ 
            message: 'User created successfully. OTP sent to email.',
            userId: results.insertId 
          });
        } catch (emailError) {
          console.error('Email error:', emailError);
          res.status(201).json({ 
            message: 'User created but failed to send OTP email',
            userId: results.insertId,
            emailError: emailError.message
          });
        }
      });
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Verify OTP endpoint
const verifyOTP = (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const verifyQuery = 'SELECT id, otp FROM users WHERE email = ?';
    db.query(verifyQuery, [email], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const user = results[0];

      if (user.otp !== otp) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }

      // Updates user verfication status and clear OTP
      const updateQuery = 'UPDATE users SET is_verified = TRUE, otp = NULL WHERE email = ?';
      db.query(updateQuery, [email], (err) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }

        res.json({ message: 'Account verified successfully' });
      });
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Login endpoint
const login = (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

  const loginQuery = 'SELECT id, email, password, is_verified, role FROM users WHERE email = ?';
    db.query(loginQuery, [email], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (results.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const user = results[0];

      if (!user.is_verified) {
        return res.status(403).json({ message: 'Account not verified' });
      }

      // Compare passwords
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generating JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getUsers = (req, res) => {
  try {
  const getUsersQuery = 'SELECT id, email, role, is_verified, created_at FROM users';
    
    db.query(getUsersQuery, (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Error fetching users' });
      }

      res.json(results);
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { signup, verifyOTP, login, getUsers };
