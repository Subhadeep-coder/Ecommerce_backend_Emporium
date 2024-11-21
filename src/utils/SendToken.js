const jwt = require('jsonwebtoken');

// Secret key for JWT (should be stored securely, e.g., in environment variables)
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Function to generate Access Token (expires in 5 minutes)
const generateAccessToken = (user) => {
    return jwt.sign({ id: user._id, isAdmin: user.isAdmin }, JWT_SECRET, {
        expiresIn: '5m'  // Access token expires in 5 minutes
    });
};

// Function to generate Refresh Token (expires in 30 days)
const generateRefreshToken = (user) => {
    return jwt.sign({ id: user._id, isAdmin: user.isAdmin }, JWT_REFRESH_SECRET, {
        expiresIn: '30d'  // Refresh token expires in 30 days
    });
};

module.exports = { generateAccessToken, generateRefreshToken };
