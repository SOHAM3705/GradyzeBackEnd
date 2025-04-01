const express = require("express");
const passport = require("../../config/passport");
const router = express.Router();

// Google OAuth Route
router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth Callback
router.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
        const { token, user } = req.user;
        res.redirect(`http://gradyzefrontend.onrender.com/oauth-success?token=${token}&email=${user.email}`);
    }
);

module.exports = router;

