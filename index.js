const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const adminRoutes = require('./api/admin/adminSignUpRoute'); // Assuming you create the sign-up route
const loginRoute = require('./api/admin/adminLoginRoute'); 
const authRoutes = require("./middleware/auth");// Assuming you create the login route
const passwordResetRoutes = require("./api/Password/passwordResetRoutes"); // Assuming you create the password reset route
const contactus = require("./api/Gsheet/contactus"); // Assuming you create the contactus route
const Adminfeedback = require("./api/Gsheet/Adminfeedback"); // Assuming you create the feedback route
const teacherRoutes = require("./api/teacher/teacherRoute"); // Assuming you create the teacher route
const teacherPasswordRoutes = require("./api/Password/teacherpassword"); // Assuming you create the teacher password route
const notificationRoutes = require('./api/admin/notificationRoute');
const syllabusRoutes = require('./api/admin/adminsyllabusroute');  // Adjust the path to your route
const { initGridFS } = require('./config/girdfs');  

const web = express();

// Importing required modules
require('dotenv').config();  

// MongoDB URI (use dotenv for sensitive information)
const MONGO_URI = process.env.MONGO_URI;

// Function to connect to MongoDB Atlas
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'AdminDB',
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`🟢 MongoDB Connected to: ${mongoose.connection.name}`);

    // ✅ Initialize GridFS only when the connection is open
    mongoose.connection.once("open", () => {
      initGridFS();
      console.log("🟢 GridFS Initialized");
    });

  } catch (error) {
    console.error("🔴 MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;


// Connect to MongoDB
connectDB();


// Middleware to parse JSON
web.use(express.json());
// Allow requests from specific origins
const allowedOrigins = [
  "https://gradyze.com",
  "https://gradyzefrontend.onrender.com",
];

// ✅ Configure CORS
web.use(
  cors({
    origin: function (origin, callback) {
      console.log("🌍 Incoming Request from:", origin || "Unknown Origin"); // Debugging Log

      // Check if the origin is allowed or if it's a request without an origin (e.g., server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true); // Allow the request
      } else {
        console.error("❌ CORS Blocked:", origin); // Log blocked origin
        return callback(new Error("CORS Policy: Not allowed by CORS"), false); // Reject the request
      }
    },
    credentials: true, // ✅ Allow cookies & authentication headers
    methods: "GET,POST,PUT,DELETE,OPTIONS", // ✅ Allow necessary HTTP methods
    allowedHeaders: ["Content-Type", "Authorization", "X-Admin-ID"], // ✅ Allow important headers
    preflightContinue: false, // ✅ Prevent CORS preflight requests from continuing to the next middleware
    optionsSuccessStatus: 204, // ✅ Return a successful status for preflight requests (204 is a typical success status for OPTIONS)
  })
);

// ✅ Handle Preflight Requests (OPTIONS) by sending proper response
web.options("*", (req, res) => {
  res.status(204).end(); // Return 204 status for preflight request
});

// ✅ Sample route for testing CORS
web.get("/", (req, res) => {
  res.send("CORS is configured properly!");
});

// Routes
web.use('/api/admin', adminRoutes);
web.use('/api/admin', loginRoute);
web.use("/api/password", require("./middleware/auth"),passwordResetRoutes);
web.use("/api/auth", authRoutes);
web.use("/api/Gsheet", contactus);
web.use("/api/Gsheet", Adminfeedback);

web.use("/api/teacher", teacherRoutes);
web.use("/api/password", require("./middleware/auth"), teacherPasswordRoutes);

web.use('/api/syllabus',syllabusRoutes);
web.use('/api/notifications', notificationRoutes);

// Serve static files from React's build folder
const reactBuildPath = path.join(__dirname, '../FrontEnd/dist');
web.use(express.static(reactBuildPath));

// Catch all for React routes (single-page application)
web.get('*', (req, res) => {
  res.sendFile(path.join(reactBuildPath, 'index.html'));
});

const PORT = process.env.PORT || 5173;
web.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});

