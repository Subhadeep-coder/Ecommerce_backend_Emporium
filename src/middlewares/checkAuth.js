// authMiddleware.js
const jwt = require("jsonwebtoken");
const { User } = require("../models/userModel");
const { adminModel } = require("../models/adminModel");
const { generateAccessToken, generateRefreshToken } = require("../utils/SendToken"); // Token generation

// Middleware to check if the user is logged in using access token or refresh token
const isLoggedIn = (req, res, next) => {
    const accessToken = req.headers['authorization']?.replace('Bearer ', '');

    if (!accessToken) {
        return res.status(401).json({
            message: 'Access denied. You need to log in to perform this action.'
        });
    }

    try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error("Error verifying token:", error);
        // if (error.name === 'TokenExpiredError') {
        //     try {
        //        // const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        //      //   const user = { id: decodedRefresh.id, isSeller: decodedRefresh.isSeller };
        //         const newAccessToken = generateAccessToken(user);
        //         res.cookie('token', newAccessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        //         req.user = decodedRefresh;
        //         next();
        //     } catch (refreshError) {
        //         return res.status(403).json({ message: 'Invalid refresh token. Please log in again.' });
        //     }
        // } else {
        return res.status(400).json({ message: 'Invalid or expired access token.' });
        // }
    }
};

// Middleware to check if the user is an admin
const isAdmin = async (req, res, next) => {
    try {
        const admin = await adminModel.findById(req.user.id); // Use req.user.id

        if (!admin || !admin.isAdmin) {
            return res.status(403).json({ message: "Only admins are allowed to perform this action." });
        }

        next();
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Middleware to check if the user is a seller
const isSeller = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id); // Use req.user.id

        if (!user || !user.isSeller) {
            return res.status(403).json({ message: "Only sellers are allowed to perform this action." });
        }

        next();
    } catch (error) {
        console.error("Error:", error);
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
        console.error("Error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    isLoggedIn,
    isAdmin,
    isSeller,
    isAdminOrSeller,
};