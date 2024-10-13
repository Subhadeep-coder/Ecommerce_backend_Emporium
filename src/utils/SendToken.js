const jwt = require('jsonwebtoken');

// Secret key for JWT (should be stored securely, e.g., in environment variables)
const JWT_SECRET = process.env.JWT_SECRET

// Function to generate JWT token
const generateToken = (user) => {
    return jwt.sign({ id: user._id, isAdmin: user.isAdmin }, JWT_SECRET, {
        expiresIn: '1h' // Token expiration time
    });
};

module.exports = { generateToken };
