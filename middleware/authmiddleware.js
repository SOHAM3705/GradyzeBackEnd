const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.header("Authorization");
    console.log("Authorization Header:", authHeader); // ✅ Log the header

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided, authorization denied" });
    }

    const token = authHeader.split(" ")[1]; // Extract token from 'Bearer <token>'
    if (!token) {
      return res.status(401).json({ message: "Invalid token format" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", decoded); // ✅ Log decoded data

    req.user = decoded; // Set the user in request object
    next(); // Proceed to next middleware

  } catch (error) {
    console.error("Authentication Error:", error.message);
    
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired, please log in again" });
    }

    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware;


