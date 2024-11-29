// SendToken.js
const jwt = require("jsonwebtoken");

const generateAccessToken = (user) => {
    return jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, {
        expiresIn: '1d' // Token expiration time
    });
    // return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' }); // Access token expiry set to 1 hour
};

const generateAccessToken2 = (user) => {
    return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1d' }); // Access token expiry set to 1 hour
}

const generateRefreshToken = (user) => {
    return jwt.sign(user, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' }); // Refresh token expiry set to 7 days
    // return jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_REFRESH_SECRET, {
    //     expiresIn: '7d' // Token expiration time
    // });
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    generateAccessToken2,
};
