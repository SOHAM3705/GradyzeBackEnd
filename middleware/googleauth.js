const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const Admin = require("../models/useradmin");
const Teacher = require("../models/teacheraccount");
const Student = require("../models/studentModel");
const jwt = require("jsonwebtoken");

// ✅ Google OAuth Strategy
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
        const googleId = profile.id;

        // ✅ Check in Admin, Teacher, or Student Collection
        let user = await Admin.findOne({ email }) || 
                   await Teacher.findOne({ email }) || 
                   await Student.findOne({ email });

        if (user) {
          // Store Google ID for future logins if not already stored
          if (!user.googleId) {
            user.googleId = googleId;
            await user.save();
          }

          // Generate JWT Token after successful authentication
          const role = user.constructor.modelName.toLowerCase(); // Determine role based on model name
          const token = jwt.sign(
            { id: user._id, email, role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
          );

          return done(null, { user, token, role });
        }

        // ❌ If no user found in any collection
        return done(null, false, { message: "No account found. Contact Admin." });

      } catch (error) {
        console.error("❌ Error during Google authentication:", error);
        return done(error, null);
      }
    }
  )
);

// ✅ Serialize & Deserialize User (For session management)
passport.serializeUser((user, done) => {
  done(null, { id: user._id, collection: user.constructor.modelName });
});

passport.deserializeUser(async (obj, done) => {
  try {
    let user;
    // Determine which collection to query based on saved information
    switch (obj.collection) {
      case "Admin":
        user = await Admin.findById(obj.id);
        break;
      case "Teacher":
        user = await Teacher.findById(obj.id);
        break;
      case "Student":
        user = await Student.findById(obj.id);
        break;
      default:
        return done(new Error("Invalid user type"), null);
    }

    done(null, user);
  } catch (error) {
    console.error("❌ Error during user deserialization:", error);
    done(error, null);
  }
});

module.exports = passport;

