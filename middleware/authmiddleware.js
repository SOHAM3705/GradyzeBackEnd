const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    // Extract token from the Authorization header
    const token = req.header("Authorization")?.split(" ")[1]; // 'Bearer <token>'
    
    if (!token) {
      return res.status(401).json({ message: "No token provided, authorization denied" });
    }

    // Verify the token using your secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded user data to the request object
    req.user = decoded;

    // Proceed to the next middleware or route handler
    next();

  } catch (error) {
    console.error("Authentication error:", error.message);
    
    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token expired, please log in again" });
    }

    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware;

