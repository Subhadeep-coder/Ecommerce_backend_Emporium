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
const Payment = require("../models/paymentModel");
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

const multer = require("multer");
const upload = multer();

exports.updateProfile = [
    upload.fields([{ name: "profilePic", maxCount: 1 }]),
    catchAsyncErrors(async (req, res, next) => {
        const { fullname, phoneNumber } = req.body;
        const profilePic = req.files?.profilePic ? req.files.profilePic[0] : null;

        console.log("Request Body:", req.body);
        console.log("Request Files:", req.files);

        const ph = phoneNumber ? Number(phoneNumber.replace(/\D/g, "")) : undefined;
        console.log("Parsed Phone Number (ph):", ph);

        const updateFields = {
            ...(fullname && { fullname }),
            ...(ph !== undefined && !isNaN(ph) && { phoneNumber: ph }),
        };

        if (profilePic) {
            updateFields.profilePic = profilePic.buffer;
            updateFields.imageMimeType = profilePic.mimetype;
        }

        console.log("Update Fields Object:", updateFields);

        try {
            const user = await DeliveryAgentModel.findByIdAndUpdate(
                req.user.id,
                updateFields,
                { new: true, runValidators: true }
            ).select("-password");

            if (!user) {
                return next(new ErrorHandler("User not found.", 404));
            }

            res.json({
                success: true,
                message: "Profile Updated",
                user,
            });
        } catch (error) {
            console.error("Update Error:", error);
            return next(new ErrorHandler(error.message, 400));
        }
    }),
];


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
    const newPaymentModel = await Payment.create({
        orderId: updatedOrder._id,
        status: "Completed",
        amount: updatedOrder.totalAmount,
        currency: "USD",
    });
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
        // const profilePic = payload["picture"];
        const phoneNumber = payload["phone_number"] || 1234567890

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
    const fetchCompletedPayments = async (userId) => {
        try {
            const completedPayments = await Payment.aggregate([
                {
                    // Lookup products for the given user
                    $lookup: {
                        from: 'products',
                        localField: 'productId',
                        foreignField: 'productId',
                        as: 'productDetails',
                    },
                },
                {
                    // Unwind the productDetails array
                    $unwind: '$productDetails',
                },
                {
                    // Match the userId in the productDetails and filter completed payments
                    $match: {
                        'productDetails.userId': userId,
                        status: 'completed',
                    },
                },
                {
                    // Optional: Project required fields
                    $project: {
                        _id: 0,
                        orderId: 1,
                        productId: 1,
                        status: 1,
                        'productDetails.name': 1,
                    },
                },
            ]);

            return completedPayments;
        } catch (error) {
            console.error('Error fetching completed payments:', error);
            throw error;
        }
    };

};

exports.fetchCompletedPayments = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(userId);
        // const completedPayments = await Payment.aggregate([
        //     {
        //         // Lookup orders for the given payment
        //         $lookup: {
        //             from: 'orders',
        //             localField: 'orderId',
        //             foreignField: '_id',
        //             as: 'orderDetails',
        //         },
        //     },
        //     {
        //         // Unwind the orderDetails array
        //         $unwind: '$orderDetails',
        //     },
        //     {
        //         // Unwind the products array inside orderDetails
        //         $unwind: '$orderDetails.products',
        //     },
        //     {
        //         // Lookup products based on productId from orderDetails
        //         $lookup: {
        //             from: 'products',
        //             localField: 'orderDetails.products.productId',
        //             foreignField: '_id',
        //             as: 'productDetails',
        //         },
        //     },
        //     {
        //         // Unwind the productDetails array
        //         $unwind: '$productDetails',
        //     },
        //     {
        //         // Exclude the images field from productDetails
        //         $project: {
        //             'productDetails.images': 0,
        //         },
        //     },
        //     {
        //         // Match the userId and status
        //         $match: {
        //             'productDetails.user': new mongoose.Types.ObjectId(userId),
        //             status: 'Completed',
        //         },
        //     },
        //     // {
        //     //     $project: {
        //     //       orderId: 1,
        //     //       'orderDetails.products': 1,
        //     //       productDetails: 1,
        //     //       status: 1,
        //     //     },
        //     //   },
        //     {
        //         // Group to calculate total revenue and total items sold
        //         $group: {
        //             _id: null,
        //             totalRevenue: { $sum: '$amount' }, // Sum the amounts for revenue
        //             totalItemsSold: { $sum: '$orderDetails.products.quantity' }, // Sum product quantities for total items sold
        //             data: { $push: '$$ROOT' }, // Preserve all original documents
        //         },
        //     },
        //     {
        //         // Unwind data back to individual documents
        //         $unwind: '$data',
        //     },
        //     {
        //         // Add totalRevenue and totalItemsSold to each document
        //         $addFields: {
        //             'data.totalRevenue': '$totalRevenue',
        //             'data.totalItemsSold': '$totalItemsSold',
        //         },
        //     },
        //     {
        //         // Restore the original structure
        //         $replaceRoot: {
        //             newRoot: '$data',
        //         },
        //     },
        // ]);

        // Log the productDetails for debugging
        //console.dir(completedPayments, { depth: null });
        const orders = await Order.aggregate([
            { $match: { deliveryStatus: "delivered" } },
            // Unwind the products array to deal with individual products
            { $unwind: "$products" },

            // Lookup to join with the product collection
            {
                $lookup: {
                    from: "products", // The name of the Product collection (case-sensitive)
                    localField: "products.productId",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },

            // Unwind the productDetails array to get the actual product object
            { $unwind: "$productDetails" },

            // Match products where the user field matches the sellerId
            { $match: { "productDetails.user": new mongoose.Types.ObjectId(userId) } },

            // Project the desired fields
            {
                $project: {
                    _id: 0,
                    orderId: "$_id", // Include the order ID for context
                    productId: "$products.productId",
                    quantity: "$products.quantity",
                    productDetails: 1, // Includes the entire product details
                }
            }
        ]);
        let revenue = 0;
        let unitSold = 0;
        orders.forEach((element) => {
            revenue += element.productDetails.price * element.quantity;
            unitSold += element.quantity;
        });
        return res.json({
            message: 'Completed Payments',
            data: { ...orders, revenue, unitSold },
        });
    } catch (error) {
        console.error('Error fetching completed payments:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

exports.getChartDetails = async (req, res) => {
    try {
        const userId = req.user.id;

        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
        const currentYear = currentDate.getFullYear();

        const dailyRevenue = await Payment.aggregate([
            {
                // Match completed payments for the current month and year
                $match: {
                    status: 'Completed',
                    createdAt: {
                        $gte: new Date(`${currentYear}-${currentMonth}-01T00:00:00Z`),
                        $lt: new Date(`${currentYear}-${currentMonth + 1}-01T00:00:00Z`),
                    },
                },
            },
            {
                // Lookup orders for the given payment
                $lookup: {
                    from: 'orders',
                    localField: 'orderId',
                    foreignField: '_id',
                    as: 'orderDetails',
                },
            },
            {
                // Unwind the orderDetails array
                $unwind: '$orderDetails',
            },
            {
                // Lookup products based on productId from orderDetails
                $lookup: {
                    from: 'products',
                    localField: 'orderDetails.products.productId',
                    foreignField: '_id',
                    as: 'productDetails',
                },
            },
            {
                // Unwind the productDetails array
                $unwind: '$productDetails',
            },
            {
                // Match products created by the current user
                $match: {
                    'productDetails.user': new mongoose.Types.ObjectId(userId),
                },
            },
            {
                // Group by day of the month
                $group: {
                    _id: { day: { $dayOfMonth: '$createdAt' } },
                    totalRevenue: { $sum: '$amount' },
                },
            },
            {
                // Project the final result
                $project: {
                    _id: 0,
                    date: { $concat: [{ $toString: '$_id.day' }] },
                    value: '$totalRevenue',
                },
            },
            {
                // Sort by day in ascending order
                $sort: { date: 1 },
            },
        ]);

        const monthlyRevenue = await Payment.aggregate([
            {
                // Match completed payments only
                $match: {
                    status: 'Completed',
                },
            },
            {
                // Lookup orders for the given payment
                $lookup: {
                    from: 'orders',
                    localField: 'orderId',
                    foreignField: '_id',
                    as: 'orderDetails',
                },
            },
            {
                // Unwind the orderDetails array
                $unwind: '$orderDetails',
            },
            {
                // Lookup products based on productId from orderDetails
                $lookup: {
                    from: 'products',
                    localField: 'orderDetails.products.productId',
                    foreignField: '_id',
                    as: 'productDetails',
                },
            },
            {
                // Unwind the productDetails array
                $unwind: '$productDetails',
            },
            {
                // Match products created by the current user
                $match: {
                    'productDetails.user': new mongoose.Types.ObjectId(userId),
                },
            },
            {
                // Group by month
                $group: {
                    _id: { month: { $month: '$createdAt' } },
                    totalRevenue: { $sum: '$amount' },
                },
            },
            {
                // Add month name to the data
                $addFields: {
                    monthName: {
                        $arrayElemAt: [
                            [
                                'Jan',
                                'Feb',
                                'Mar',
                                'Apr',
                                'May',
                                'Jun',
                                'Jul',
                                'Aug',
                                'Sep',
                                'Oct',
                                'Nov',
                                'Dec',
                            ],
                            { $subtract: ['$_id.month', 1] },
                        ],
                    },
                },
            },
            {
                // Project the required fields
                $project: {
                    _id: 0,
                    date: '$monthName',
                    value: '$totalRevenue',
                },
            },
            {
                // Sort by month in ascending order
                $sort: { date: 1 },
            },
        ]);

        const yearlyRevenue = await Payment.aggregate([
            {
                // Match completed payments
                $match: {
                    status: 'Completed',
                },
            },
            {
                // Lookup orders for the given payment
                $lookup: {
                    from: 'orders',
                    localField: 'orderId',
                    foreignField: '_id',
                    as: 'orderDetails',
                },
            },
            {
                // Unwind the orderDetails array
                $unwind: '$orderDetails',
            },
            {
                // Lookup products based on productId from orderDetails
                $lookup: {
                    from: 'products',
                    localField: 'orderDetails.products.productId',
                    foreignField: '_id',
                    as: 'productDetails',
                },
            },
            {
                // Unwind the productDetails array
                $unwind: '$productDetails',
            },
            {
                // Match products created by the current user
                $match: {
                    'productDetails.user': new mongoose.Types.ObjectId(userId),
                },
            },
            {
                // Group by year
                $group: {
                    _id: { year: { $year: '$createdAt' } },
                    totalRevenue: { $sum: '$amount' },
                },
            },
            {
                // Filter to include years starting from 2020
                $match: {
                    '_id.year': { $gte: 2020 },
                },
            },
            {
                // Project the final result
                $project: {
                    _id: 0,
                    date: { $toString: '$_id.year' }, // Year as string
                    value: '$totalRevenue',
                },
            },
            {
                // Sort by year in ascending order
                $sort: { date: 1 },
            },
        ]);

        // Return the monthly revenue
        return res.json({
            message: 'Monthly Revenue',
            data: {
                day: dailyRevenue,
                month: monthlyRevenue,
                year: yearlyRevenue,
            },
        });
    } catch (error) {
        console.error('Error fetching completed payments:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}