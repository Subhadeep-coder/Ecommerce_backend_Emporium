// SendToken.js
const jwt = require("jsonwebtoken");

const generateAccessToken = (user) => {
    return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' }); // Access token expiry set to 1 hour
};

const generateRefreshToken = (user) => {
    return jwt.sign(user, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' }); // Refresh token expiry set to 7 days
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
};
