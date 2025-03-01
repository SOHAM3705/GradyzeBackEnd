const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const authMiddleware = (req, res, next) => {
    const token = req.header("Authorization");
    console.log("Received Token:", token); // Debugging log

    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    try {
        const tokenWithoutBearer = token.replace("Bearer ", "");
        console.log("Token after removing 'Bearer':", tokenWithoutBearer);

        const decoded = jwt.verify(tokenWithoutBearer, process.env.JWT_SECRET);
        console.log("Decoded Token:", decoded);

        req.teacher = decoded; // Attach teacher info to request
        next();
    } catch (error) {
        console.error("JWT Verification Error:", error);
        res.status(400).json({ message: "Invalid token." });
    }
};

module.exports = authMiddleware;

