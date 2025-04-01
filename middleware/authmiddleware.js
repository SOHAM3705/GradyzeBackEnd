const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    // Extract token from Authorization header or Cookies
    const authHeader = req.header("Authorization");
    const token = authHeader ? authHeader.split(" ")[1] : req.cookies?.token;

    console.log("Authorization Header:", authHeader);
    console.log("Extracted Token:", token);

    if (!token) {
      return res.status(401).json({ message: "No token provided, authorization denied" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", decoded);

    // Extract user details from token
    req.user = {
      id: decoded.id, // Common user ID
      role: decoded.role, // Can be "teacher", "admin", or "student"
      email: decoded.email, // Email (optional for logging)
    };

    next(); // Continue to the next middleware/route

  } catch (error) {
    console.error("Authentication Error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired, please log in again" });
    }

    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware;
