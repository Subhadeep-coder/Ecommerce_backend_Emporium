const { catchAsyncErrors } = require("../middlewares/catchAsyncError");
const DeliveryAgentModel = require("../models/deliveryAgentModel");
const Order = require("../models/orderModel");
const bcrypt = require("bcrypt");
const { generateAccessToken2 } = require("../utils/SendToken");
const jwt = require('jsonwebtoken');
const ErrorHandler = require("../utils/ErrorHandler");
const crypto = require("crypto");
const mongoose = require("mongoose");
const sendMail = require("../utils/nodemailer");
const { OAuth2Client } = require("google-auth-library");

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
    await sendMail({ email, template: "send-otp.ejs", data: { name, activationCode, date: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) } });
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

exports.getNearestOrders = catchAsyncErrors(async (req, res, next) => {
    try {
        const location = req.query;

        // if (
        //     !location ||
        //     !Array.isArray(location) ||
        //     location.length !== 2 ||
        //     typeof location[0] !== 'number' ||
        //     typeof location[1] !== 'number' ||
        //     location[0] < -180 || location[0] > 180 ||
        //     location[1] < -90 || location[1] > 90
        // ) {
        //     return res.status(400).json({ message: "Invalid location data. Provide [longitude, latitude] within valid ranges." });
        // }

        const orders = await Order.aggregate([
            {
                $geoNear: {
                    near: {
                        type: "Point",
                        coordinates: [parseFloat(location.y), parseFloat(location.x)]
                    },
                    distanceField: "dist.calculated",
                    maxDistance: 1609000,
                    spherical: true
                }
            },
            {
                $match: {
                    $or: [
                        { deliveryAgent: null },
                        { deliveryAgent: { $exists: false } }
                    ]
                }
            }
        ]);

        return res.status(200).json({ orders });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "An error occurred while fetching orders.", error });
    }
});

exports.assignOrder = catchAsyncErrors(async (req, res, next) => {
    const userId = req.user.id;
    const { orderId } = req.body;
    const updatedDeliveryAgent = await DeliveryAgentModel.findByIdAndUpdate(userId, {
        $set: {
            isAvailable: false
        }
    });
    const updatedOrder = await Order.findByIdAndUpdate(orderId, {
        $set: {
            deliveryAgent: updatedDeliveryAgent._id
        }
    });

    return res.status(200).json({
        message: "Assigned successfully",
        orderId: updatedOrder._id
    });
})

exports.getOrderDetails = catchAsyncErrors(async (req, res, next) => {
    const userId = req.user.id;

    const orders = await Order.aggregate([
        {
            $match: {
                deliveryAgent: new mongoose.Types.ObjectId(userId),
                deliveryStatus: { $ne: "delivered" }
            }
        }
    ]);

    if (!orders || orders.length === 0) {
        return res.status(404).json({
            success: false,
            message: "No orders found for the delivery agent."
        });
    }

    return res.status(200).json({
        success: true,
        orders
    });
});

exports.markOrderAsDelivered = catchAsyncErrors(async (req, res, next) => {
    const userId = req.user.id;
    const { orderId } = req.params;

    const updatedOrder = await Order.findOneAndUpdate(
        {
            _id: orderId,
            deliveryAgent: new mongoose.Types.ObjectId(userId),
            deliveryStatus: { $ne: "delivered" },
        },
        {
            $set: { deliveryStatus: "delivered" },
        },
        {
            new: true,
        }
    );

    if (!updatedOrder) {
        return res.status(404).json({
            success: false,
            message: "Order not found or already delivered.",
        });
    }

    return res.status(200).json({
        success: true,
        message: "Order marked as delivered successfully.",
        order: updatedOrder,
    });
});

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.verifyGoogleToken = async (req, res) => {
    const { idToken } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const googleId = payload["sub"];
        const email = payload["email"];
        const fullname = payload["name"];
        const profilePic = payload["picture"];
        // const phoneNumber = payload["phone_number"] || null;

        let agent = await DeliveryAgentModel.findOne({ googleId });

        let isNewAgent = false;

        if (!agent) {
            agent = new DeliveryAgentModel({
                googleId,
                email,
                fullname,
                // profilePic,
                phoneNumber,
            });

            await agent.save();
            isNewAgent = true;
        }

        const token = jwt.sign(
            { id: agent._id, email: agent.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({
            token,
            isNewAgent,
            agent: {
                id: agent._id,
                email: agent.email,
                fullname: agent.fullname,
                // profilePic: agent.profilePic,
                phoneNumber: agent.phoneNumber,
            },
        });
    } catch (error) {
        res.status(401).json({ message: "Invalid ID token" });
    }
};
