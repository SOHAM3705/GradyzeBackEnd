const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const adminRoutes = require('./api/admin/adminSignUpRoute'); // Assuming you create the sign-up route
const loginRoute = require('./api/admin/adminLoginRoute'); // Assuming you create the login route

const web = express();

// Importing required modules
require('dotenv').config();  

// MongoDB URI (use dotenv for sensitive information)
const MONGO_URI = process.env.MONGO_URI;

// Function to connect to MongoDB Atlas
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
     
      dbName: 'AdminDB',  // Ensure connection to the 'admin' database
    });
    console.log(`🟢 MongoDB Connected to: ${mongoose.connection.name}`);
  } catch (error) {
    console.error("🔴 MongoDB Connection Error:", error);
    process.exit(1);
  }
};

// Connect to MongoDB
connectDB();


// Middleware to parse JSON
web.use(express.json());
web.use(cors({
  origin: 'http://localhost:5173', // React app running on localhost:5173
  methods: ['GET', 'POST'],
  credentials: true,
}));

// Routes
web.use('/api/admin', adminRoutes);
web.use('/api/admin', loginRoute);

// Serve static files from React's build folder
const reactBuildPath = path.join(__dirname, '../FrontEnd/dist');
web.use(express.static(reactBuildPath));

// Catch all for React routes (single-page application)
web.get('*', (req, res) => {
  res.sendFile(path.join(reactBuildPath, 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 5173;
web.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
