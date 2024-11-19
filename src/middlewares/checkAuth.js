const jwt = require("jsonwebtoken");
const { User } = require("../models/userModel");
const { adminModel } = require("../models/adminModel");

// Middleware to check if the user is logged in using a token
const isLoggedIn = (req, res, next) => {
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ 
            message: 'Access denied. You need to log in to perform this action.' // Clear message when no token is provided
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
            return res.status(400).json({ message: 'Invalid token. No user ID found.' });
        }
        req.user = decoded;  // Attach the decoded user object (which contains 'id')
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token.' });
    }
};

// Middleware to check if the user is an admin
const isAdmin = async (req, res, next) => {
    try {
        const admin = await adminModel.findById(req.user.id); // Use req.user.id instead of req.id.adminId

        if (!admin || !admin.isAdmin) {
            return res.status(403).json({ message: "Only admins are allowed to perform this action." });
        }

        next();
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Middleware to check if the user is a seller
const isSeller = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id); // Use req.user.id instead of req.id.userId

        if (!user || !user.isSeller) {
            return res.status(403).json({ message: "Only sellers are allowed to perform this action." });
        }

        next();
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Middleware to check if the user is either an admin or a seller
const isAdminOrSeller = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        const admin = await adminModel.findById(req.user.id);

        // Check if the user is either an admin or a seller
        if (!user && !admin) {
            return res.status(403).json({ message: "Access denied. You are neither an admin nor a seller." });
        }
        if (user?.isSeller || admin?.isAdmin) {
            next(); // Allow access if the user is a seller or admin
        } else {
            return res.status(403).json({ message: "Access denied. You are neither an admin nor a seller." });
        }
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};


module.exports = {
    isLoggedIn,
    isAdmin,
    isSeller,
    isAdminOrSeller,
};
