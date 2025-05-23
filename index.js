const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const adminRoutes = require('./api/admin/adminSignUpRoute'); // Assuming you create the sign-up route
const loginRoute = require('./api/admin/adminLoginRoute'); 
const authRoutes = require("./middleware/auth");// Assuming you create the login route
const passwordResetRoutes = require("./api/Password/passwordResetRoutes"); // Assuming you create the password reset route
const contactus = require("./api/Gsheet/contactus"); // Assuming you create the contactus route
const feedback = require("./api/Gsheet/feedback"); // Assuming you create the feedback route
const teacherRoutes = require("./api/teacher/teacherRoute"); // Assuming you create the teacher route
const teacherPasswordRoutes = require("./api/Password/teacherpassword"); // Assuming you create the teacher password route
const notificationRoutes = require('./api/admin/notificationRoute');
const syllabusRoutes = require('./api/admin/adminsyllabusroute');  // Adjust the path to your route
const { initGridFS } = require('./config/girdfs');  
const teachersyllabiRoute = require("./api/teacher/teachersyllabiRoute"); // Assuming you create the teacher syllabi route
const teacherNotificationRoute = require("./api/teacher/teachernotificationRoute"); // Assuming you create the teacher notification route
const studentmanagementRoute = require("./api/teacher/studentmanagnmentRoute"); // Assuming you create the student management route
const student = require("./api/student/studentRoue"); // Assuming you create the student management route
const teachermarks = require("./api/teacher/teachermarksRoute"); // Assuming you create the teacher marks route
const adminsettingRoute = require("./api/admin/adminsettingRoute");
const adminStudentManagement = require("./api/admin/adminStudentManagementRoute");
const adminStudentMarks = require("./api/admin/adminStudentMarksRoute")
const teacherSettingRoute = require("./api/teacher/teachersettingRoute");
const studentSettingRoute = require("./api/student/studentsettingRoute");
const studentnotificationRoute = require("./api/student/studentnotificationRoute");
const studentpassword = require("./api/Password/studentpassword");
const studentResult = require("./api/student/studentResult");
const googleauthRoutes = require("./api/Google/googleauth");
const web = express();
const session = require("express-session");
const passport = require("./config/passport");
const teacherTestRoute = require("./api/teacher/teachertest");


// Importing required modules
require('dotenv').config();  

// MongoDB URI (use dotenv for sensitive information)
const MONGO_URI = process.env.MONGO_URI;

// Function to connect to MongoDB Atlas

const connectDB = async () => {
  try {
    if (!MONGO_URI) {
      throw new Error("❌ MONGO_URI is not defined in environment variables");
    }

    // ✅ Connect to MongoDB
    await mongoose.connect(MONGO_URI, {
      dbName: "AdminDB",
      useNewUrlParser: true,
    });

    console.log(`🟢 MongoDB Connected to: ${mongoose.connection.name}`);

    // ✅ Initialize GridFS only when the connection is open
    mongoose.connection.once("open", () => {
      initGridFS();
      console.log("🟢 GridFS Initialized");
    });

    // ✅ Handle disconnections
    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB Disconnected. Reconnecting...");
      connectDB(); // Attempt to reconnect
    });

  } catch (error) {
    console.error("🔴 MongoDB Connection Error:", error.message);
    process.exit(1); // Exit the process if the connection fails
  }
};

module.exports = connectDB;


// Connect to MongoDB
connectDB();

web.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      httpOnly: true, // Prevent client-side JS from accessing the cookie
      maxAge: 1000 * 60 * 60 * 24 // Session expires in 1 day
    }
  })
);

// Initialize Passport
web.use(passport.initialize());
web.use(passport.session());

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
    allowedHeaders: ["Content-Type", "Authorization", "X-Admin-ID","X-Requested-With", "Accept", "adminid", "teacherid"], // ✅ Allow important headers
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
web.use("/api/password",passwordResetRoutes);
web.use("/api/Gsheet", contactus);
web.use("/api/Gsheet", feedback);

web.use("/api/teacher", teacherRoutes);
web.use("/api/password/teacherpassword", teacherPasswordRoutes);
web.use("/api/password/studentpassword", studentpassword);

web.use('/api/syllabi',syllabusRoutes);
web.use('/api/notifications', notificationRoutes);

web.use("/api/teachersyllabi", teachersyllabiRoute);
web.use("/api/teachernotifications", teacherNotificationRoute);
web.use("/api/studentmanagement", studentmanagementRoute);

web.use("/api/student", student);
web.use("/api/teachermarks", teachermarks);
web.use("/api/adminsetting", adminsettingRoute);
web.use("/api/teachersetting", teacherSettingRoute);
web.use("/api/studentsetting", studentSettingRoute);
web.use("/api/studentnotification",studentnotificationRoute);
web.use("/api/studentResult",studentResult);
web.use("/api/auth", googleauthRoutes);
web.use("/api/admin", adminStudentManagement);
web.use("/api/admin",adminStudentMarks);
web.use("/api/teacher", teacherTestRoute);

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

