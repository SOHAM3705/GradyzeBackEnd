const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const Admin = require("../models/useradmin");
const Teacher = require("../models/teacheraccount");
const Student = require("../models/studentModel");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        // Check if the user exists in Admin, Teacher, or Student collections
        let user = await Admin.findOne({ email });
        let role = "admin";

        if (!user) {
          user = await Teacher.findOne({ email });
          role = "teacher";
        }
        if (!user) {
          user = await Student.findOne({ email });
          role = "student";
        }
        
        if (!user) {
          return done(null, false, { message: "No account found for this email" });
        }

        // Generate JWT token
        const token = jwt.sign(
          { id: user._id, role },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );

        return done(null, { user, token, role });
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

module.exports = passport;
