const { catchAsyncErrors } = require("../middlewares/catchAsyncError");
const DeliveryAgentModel = require("../models/deliveryAgentModel");
const bcrypt = require("bcrypt");
const { generateAccessToken2 } = require("../utils/SendToken");
const jwt = require('jsonwebtoken');
const ErrorHandler = require("../utils/ErrorHandler");
const crypto = require("crypto")

const generateActivationCode = (user) => {
    const activationCode = crypto.randomInt(1000000).toString();

    const token = jwt.sign(
        { user, activationCode },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );
    return { token, activationCode };
};

exports.registerDeliveryAgent = catchAsyncErrors(async (req, res, next) => {
    const { name, phoneNumber, email, password } = req.body;

    const { profilePicBuffer, profilePicMimetype } = req.files?.profilePic ? req.files.profilePic[0] : {};

    const existingEmailUser = await DeliveryAgentModel.findOne({ email });
    if (existingEmailUser) {
        return next(new ErrorHandler("User already registered with this email.", 400));
    }

    const user = { name, phoneNumber, email, password, profilePicBuffer, profilePicMimetype };
    const { token: activationToken, activationCode } = generateActivationCode(user);
    console.log(activationCode);

    res.status(200).json({ message: "Activation code sent to your email.", activationToken });
});


exports.verifyDeliveryAgent = catchAsyncErrors(async (req, res, next) => {
    const { activationToken, activationCode } = req.body;

    if (!activationToken || !activationCode) {
        return next(new ErrorHandler("Please provide the activation token and code.", 400));
    }

    try {
        const decoded = jwt.verify(activationToken, process.env.JWT_SECRET);
        if (!decoded) {
            return next(new ErrorHandler("Invalid activation token.", 400));
        }


        if (activationCode !== decoded.activationCode) {
            return next(new ErrorHandler("Invalid activation code.", 400));
        }

        const { name, phoneNumber, email, password, profilePicBuffer, profilePicMimetype } = decoded.user;


        const hashedPassword = await bcrypt.hash(password, 10);


        const newUser = await DeliveryAgentModel.create({
            fullname: name,
            email: email,
            password: hashedPassword,
            phoneNumber,
            profilePic: profilePicBuffer || null,
            profilePicMimeType: profilePicMimetype || null,
        });

        const accessToken = generateAccessToken2({ id: newUser._id, isSeller: newUser.isSeller });
        res.status(201).json({
            accessToken, // Send access token
            message: "User registered successfully.",
            newUser
        });

    } catch (error) {
        return next(new ErrorHandler("Invalid or expired activation token." + error.toString(), 400));
    }
});

exports.loginDeliveryAgent = catchAsyncErrors(async (req, res, next) => {
    const { email, password } = req.body;

    // Check if the user exists
    const user = await DeliveryAgentModel.findOne({ email }).select('+password');
    if (!user) {
        return next(new ErrorHandler("Invalid email or password.", 400));
    }

    console.log(user.name)

    // Compare passwords
    const isMatch = bcrypt.compare(password, user.password);
    if (!isMatch) {
        return next(new ErrorHandler("Invalid email or password.", 400));
    }

    // Generate tokens
    const accessToken = generateAccessToken2({ id: user._id, isSeller: user.isSeller });
    // const refreshToken = generateRefreshToken({ id: user._id, isSeller: user.isSeller });

    // Set refresh token in a cookie
    // res.cookie('refreshToken', refreshToken, {
    //     httpOnly: true,
    //     expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
    // });

    // // Set the access token in an HTTP-only cookie
    // res.cookie('token', accessToken, {
    //     httpOnly: true,
    //     // secure: process.env.NODE_ENV === 'production', // Ensure secure cookies in production
    //     expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
    // });

    // console.log("22222")

    // Respond with access token
    res.status(200).json({
        accessToken,
        message: "Logged in successfully.",
        user
    });
});

exports.getDeliveryAgentProfile = catchAsyncErrors(async (req, res, next) => {
    const user = await DeliveryAgentModel.findOne({ _id: req.user.id }).select('-password');

    if (!user) {
        return next(new ErrorHandler("User not found.", 404));
    }

    res.status(200).json(user);
})