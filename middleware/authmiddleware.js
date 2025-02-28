const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const token = req.header("Authorization")?.split(" ")[1]; // Extract token
    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify token
    req.user = decoded; // Attach user to request

    next(); // Move to the next middleware
  } catch (error) {
    console.error("Authentication error:", error.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware;
