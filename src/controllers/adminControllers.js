const bcrypt = require('bcrypt');
const { adminModel, adminValidator } = require('../models/adminModel');
const { catchAsyncErrors } = require("../middlewares/catchAsyncError");
const ErrorHandler = require("../utils/ErrorHandler");
const { generateToken } = require("../utils/SendToken");  // Import the token generation function
const sendMail = require("../utils/nodemailer");
const crypto = require("crypto");

// Test Route
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
        profilePic: buffer,
        imageMimeType: mimetype,
        isAdmin: isAdmin !== undefined ? isAdmin : true,
    });

    await newAdmin.save();

    // Create JWT Token for the newly registered admin
    const token = generateToken(newAdmin._id, newAdmin.isAdmin, false, newAdmin._id);

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
    const token = generateToken(admin._id, admin.isAdmin, false, admin._id);

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
    const admin = await adminModel.findById(req.user.id).select('-password');
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
        req.user.id, // Use req.user.id
        { bio, name, isAdmin },
        { new: true, runValidators: true }
    ).select('-password');

    if (!admin) {
        return next(new ErrorHandler("Admin not found.", 404));
    }

    res.json({ message: "Profile updated successfully", admin });
});

// Password Reset Request
exports.passwordReset = catchAsyncErrors(async (req, res, next) => {
    const { email } = req.body;
    const user = await adminModel.findOne({ email });

    if (user) {
        const otp = crypto.randomInt(100000, 999999).toString();

        // Save OTP and email in session
        req.session.otp = otp;
        req.session.verifiedEmail = email;
        req.session.otpExpire = Date.now() + 5 * 60 * 1000; // OTP expires in 5 minutes

        await sendMail(email, `Your OTP for password reset is: ${otp}`); // Send OTP to email
        res.status(200).json({ message: "OTP sent successfully." });
    } else {
        return next(new ErrorHandler("This email does not exist.", 404));
    }
});

// OTP Verification
exports.otpVerify = catchAsyncErrors(async (req, res, next) => {
    const enteredOtp = req.body.otp;

    const expectedOtp = req.session.otp;
    const otpExpire = req.session.otpExpire;

    // Check if OTP has expired
    if (Date.now() > otpExpire) {
        return next(new ErrorHandler("OTP has expired. Please request a new OTP.", 400));
    }

    // OTP validation logic
    if (enteredOtp === expectedOtp) {
        req.session.isOtpVerified = true;
        res.status(200).json({ message: "OTP verified successfully." });
    } else {
        return next(new ErrorHandler("Invalid OTP. Please try again.", 400));
    }
});

// Password Update
exports.passwordUpdate = catchAsyncErrors(async (req, res, next) => {
    const { newPassword } = req.body;

    // Check if newPassword is provided
    if (!newPassword || newPassword.trim() === "") {
        return next(new ErrorHandler("New password is required.", 400));
    }

    if (req.session.verifiedEmail) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await adminModel.findOneAndUpdate(
            { email: req.session.verifiedEmail },
            { password: hashedPassword }
        );

        // Clear session after successful update
        req.session.verifiedEmail = null;
        req.session.isOtpVerified = null;
        req.session.otp = null;

        res.status(200).json({ message: "Password reset successfully." });
    } else {
        return next(new ErrorHandler("Email verification required.", 400));
    }
});

// Resend OTP
exports.resendOtp = catchAsyncErrors(async (req, res, next) => {
    const email = req.session.verifiedEmail; // Get the verified email from the session

    if (!email) {
        return next(new ErrorHandler("No email found in session.", 400));
    }

    const otp = crypto.randomInt(100000, 999999).toString();

    // Store the new OTP and expiration in the session
    req.session.otp = otp;
    req.session.otpExpire = Date.now() + 5 * 60 * 1000; // OTP expires in 5 minutes

    await sendMail(email, `Your new OTP is: ${otp}`);

    res.status(200).json({ message: "OTP has been resent." });
});
