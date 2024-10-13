const bcrypt = require('bcrypt');
const { adminModel, adminValidator } = require('../models/adminModel');
const { catchAsyncErrors } = require("../middlewares/catchAsyncError");
const ErrorHandler = require("../utils/ErrorHandler");
const { generateToken } = require("../utils/SendToken");  // Import the token generation function

// Register Admin

exports.test = catchAsyncErrors(async (req, res, next) => {
    res.status(201).json({ message: "Admin registered successfully." });
});

// Register Admin
exports.registerAdmin = catchAsyncErrors(async (req, res, next) => {
    const { username, name, email, password, isAdmin } = req.body;
    let { buffer, mimetype } = req.file || {};

    // Validate request body with Joi
    const validationError = adminValidator(req.body);
    if (validationError) {
        return next(new ErrorHandler(validationError.details[0].message, 400));
    }

    // Check if the email already exists
    const existingAdmin = await adminModel.findOne({ email });
    if (existingAdmin) {
        return next(new ErrorHandler("Admin already registered with this email.", 400));
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin
    const newAdmin = new adminModel({
        username,
        name,
        email,
        password: hashedPassword,
        bio: bio || null,
        profilePic: buffer,
        imageMimeType: mimetype,
        isAdmin: isAdmin !== undefined ? isAdmin : true,
    });

    await newAdmin.save();

    // Create JWT Token for the newly registered admin
    const token = generateToken(newAdmin._id, newAdmin.isAdmin, false, newAdmin._id); // Pass newAdmin._id as adminId

    // Set the token in a cookie (optional)
    res.cookie('token', token, {
        httpOnly: true,
        expires: new Date(Date.now() + 60 * 60 * 1000), // Cookie expires in 1 hour
    });

    res.status(201).json({ token, message: "Admin registered successfully.", newAdmin });
});

// Admin Login
exports.loginAdmin = catchAsyncErrors(async (req, res, next) => {
    const { email, password } = req.body;

    // Check if the admin exists
    const admin = await adminModel.findOne({ email }).select('+password');
    if (!admin) {
        return next(new ErrorHandler("Invalid email or password.", 400));
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
        return next(new ErrorHandler("Invalid email or password.", 400));
    }

    // Create JWT Token
    const token = generateToken(admin._id, admin.isAdmin, false, admin._id); // Pass admin._id as adminId

    // Set the token in a cookie (optional)
    res.cookie('token', token, {
        httpOnly: true,
        expires: new Date(Date.now() + 60 * 60 * 1000), // Cookie expires in 1 hour
    });

    res.json({ token, message: "Logged in successfully.", admin });
});

// Admin Logout
exports.logoutAdmin = catchAsyncErrors(async (req, res, next) => {
    res.cookie('token', null, {
        expires: new Date(Date.now()), // Expire cookie immediately
        httpOnly: true,
    });
    res.status(200).json({ message: "Logged out successfully." });
});

// Get Admin Profile
exports.getAdminProfile = catchAsyncErrors(async (req, res, next) => {
    const admin = await adminModel.findById(req.user.id).select('-password'); // Use req.user.id
    
    if (!admin) {
        return next(new ErrorHandler("Admin not found.", 404));
    }
    
    res.json(admin);
});

// Update Admin Profile
exports.updateProfile = catchAsyncErrors(async (req, res, next) => {
    const { bio, name, isAdmin } = req.body;

    // Validate request body with Joi
    const validationError = adminValidator(req.body);
    if (validationError) {
        return next(new ErrorHandler(validationError.details[0].message, 400));
    }

    // Update admin details
    const admin = await adminModel.findByIdAndUpdate(
        req.user.id, // Use req.user.id instead of req.admin.adminId
        { bio, name, isAdmin },
        { new: true, runValidators: true }
    ).select('-password');

    if (!admin) {
        return next(new ErrorHandler("Admin not found.", 404));
    }

    res.json({ message: "Profile updated successfully", admin });
});
