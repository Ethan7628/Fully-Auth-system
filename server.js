const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

require('dotenv').config();
require('./config/database');


const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;


app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Serve static files for profile pictures
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);


app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
  }
  if (err.message === 'Only image files are allowed!') {
    return res.status(400).json({ message: 'Only image files are allowed.' });
  }
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});