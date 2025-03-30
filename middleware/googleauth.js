const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

const Admin = require("../models/useradmin");
const Faculty = require("../models/teacheraccount");
const Student = require("../models/studentModel");

dotenv.config();

// ✅ Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const googleId = profile.id;
        let user = null;
        let role = null;

        // ✅ Check in Admin Collection
        let admin = await Admin.findOne({ email });
        if (admin) {
          if (!admin.googleId) {
            admin.googleId = googleId; // Store Google ID for future logins
            await admin.save();
          }
          user = admin;
          role = "admin";
        }

        // ✅ Check in Faculty Collection
        if (!user) {
          let faculty = await Faculty.findOne({ email });
          if (faculty) {
            if (!faculty.googleId) {
              faculty.googleId = googleId;
              await faculty.save();
            }
            user = faculty;
            role = "faculty";
          }
        }

        // ✅ Check in Student Collection
        if (!user) {
          let student = await Student.findOne({ email });
          if (student) {
            if (!student.googleId) {
              student.googleId = googleId;
              await student.save();
            }
            user = student;
            role = "student";
          }
        }

        // ❌ If user not found
        if (!user) {
          return done(null, false, { message: "No account found. Contact Admin." });
        }

        // ✅ Generate JWT Token
        const token = jwt.sign(
          { id: user._id, email: user.email, role },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        return done(null, { user, token, role });
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// ✅ Serialize & Deserialize User
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

module.exports = passport;
