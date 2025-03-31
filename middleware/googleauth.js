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
        let admin = await Admin.findOne({ email });
        if (admin) {
          if (!admin.googleId) {
            admin.googleId = googleId; // Store Google ID for future logins
            await admin.save();
          }
          // Pass role as separate parameter instead of modifying the database
          return done(null, admin, { role: "admin" });
        }
        
        // ✅ Check in Teacher Collection
        let teacher = await Teacher.findOne({ email });
        if (teacher) {
          if (!teacher.googleId) {
            teacher.googleId = googleId;
            await teacher.save();
          }
          return done(null, teacher, { role: "teacher" });
        }
        
        // ✅ Check in Student Collection
        let student = await Student.findOne({ email });
        if (student) {
          if (!student.googleId) {
            student.googleId = googleId;
            await student.save();
          }
          return done(null, student, { role: "student" });
        }
        
        // ❌ If user not found in any collection
        return done(null, false, { message: "No account found. Contact Admin." });
        
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// ✅ Serialize & Deserialize User
passport.serializeUser((user, done) => {
  done(null, { id: user._id, collection: user.constructor.modelName });
});

passport.deserializeUser(async (obj, done) => {
  try {
    let user;
    // Determine which collection to query based on saved info
    if (obj.collection === "Admin") {
      user = await Admin.findById(obj.id);
    } else if (obj.collection === "Teacher") {
      user = await Teacher.findById(obj.id);
    } else if (obj.collection === "Student") {
      user = await Student.findById(obj.id);
    }
    
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;