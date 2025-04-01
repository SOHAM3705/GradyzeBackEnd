const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const Admin = require("../models/useradmin");
const Teacher = require("../models/teacheraccount");
const Student = require("../models/studentModel");

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

        // ✅ Check in Admin Collection
        let user = await Admin.findOne({ email }) || 
                   await Teacher.findOne({ email }) || 
                   await Student.findOne({ email });

        if (user) {
          // Store Google ID for future logins if not already stored
          if (!user.googleId) {
            user.googleId = googleId;
            await user.save();
          }
          // Pass role based on the user model
          const role = user.constructor.modelName.toLowerCase(); // Convert to lowercase for consistency
          return done(null, user, { role });
        }

        // ❌ If user not found in any collection
        return done(null, false, { message: "No account found. Contact Admin." });

      } catch (error) {
        console.error("❌ Error during Google authentication:", error);
        return done(error, null);
      }
    }
  )
);

// ✅ Serialize & Deserialize User
passport.serializeUser ((user, done) => {
  done(null, { id: user._id, collection: user.constructor.modelName });
});

passport.deserializeUser (async (obj, done) => {
  try {
    let user;
    // Determine which collection to query based on saved info
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