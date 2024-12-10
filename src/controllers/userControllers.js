const bcrypt = require('bcrypt');
const { User, validateUser } = require('../models/userModel'); // Import the User model and validation
const { productModel, productValidation } = require('../models/productModel'); // Import the Product model and validation
const Notification = require('../models/notification-Model'); // Import the Product model and validation
const { catchAsyncErrors } = require("../middlewares/catchAsyncError");
const ErrorHandler = require("../utils/ErrorHandler");
const { generateAccessToken, generateRefreshToken, generateAccessToken2 } = require("../utils/SendToken");
const sendMail = require("../utils/nodemailer")
const crypto = require("crypto")
const jwt = require('jsonwebtoken');
// Import the token generation function
exports.test = (req, res, next) => {
    res.json({ message: 'hello user' });

}

// Get products by storeName (for a seller)
exports.getProductsByStore = catchAsyncErrors(async (req, res, next) => {
    const { storeName } = req.params; // Store Name ko request parameters se lein

    if (!storeName) {
        return next(new ErrorHandler("Store Name is required.", 400));
    }

    // Find the user based on storeName (assuming storeName is unique)
    const user = await User.findOne({ storeName });

    if (!user) {
        return next(new ErrorHandler("Store not found.", 404));
    }

    // Find all products related to the store (you should have storeId in Product model)
    const products = await productModel.find({
        storeName: storeName // Product model mein storeName ya storeId hona chahiye
    });

    res.status(200).json({
        message: "Products fetched successfully.",
        storeName,
        products // Store ke products
    });
});
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
exports.verifyGoogleToken = async (req, res) => {
    const { idToken } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: process.env.GOOGLE_CLIENT_IDPHONE,
        });

        const payload = ticket.getPayload();
        const googleId = payload['sub'];
        const email = payload['email'];
        const name = payload['name'];
        const profileImage = payload['picture'];

        let user = await User.findOne({ googleId });

        let isNewUser = false;

        if (!user) {
            user = new User({
                googleId,
                email,
                name,
                profilePic: profileImage,
                username: email.split('@')[0],
                // Other user fields if required
            });

            await user.save();
            isNewUser = true;
        }

        console.log("hello1")

        // Generate a JWT token (matching your other routes)
        const token = generateAccessToken(user);

        res.json({
            token,
            isNewUser,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                name: user.name,
                profileImage: user.profilePic,
                isSeller: user.isSeller,
                storeName: user.storeName,
                storeDescription: user.storeDescription,
            }
        });

    } catch (error) {
        console.error('Error verifying ID token:', error);
        res.status(401).json({ message: 'Invalid ID token' });
    }
};


exports.verifyGoogleTokenForSeller = async (req, res) => {
    const { idToken, } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const googleId = payload['sub'];
        const email = payload['email'];
        const name = payload['name'];
        const profileImage = payload['picture'];

        let user = await User.findOne({ googleId });

        let isNewUser = false;

        if (!user) {
            user = new User({
                googleId,
                email,
                name,
                profilePic: profileImage,
                username: email.split('@')[0],
                isSeller: true,
                storeName: "Untitled",
                // Other user fields if required
            });

            await user.save();
            isNewUser = true;
        }

        console.log("hello1")
        if (!user.isSeller) {
            return {
                success: false,
                message: "You're not seller"
            };
        }
        // Generate a JWT token (matching your other routes)
        const token = generateAccessToken(user);

        res.json({
            token,
            isNewUser,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                name: user.name,
                profileImage: user.profilePic,
                isSeller: user.isSeller,
                storeImage: user.storeImage,
                storeName: user.storeName,
                storeDescription: user.storeDescription,
            }
        });

    } catch (error) {
        console.error('Error verifying ID token:', error);
        res.status(401).json({ message: 'Invalid ID token' });
    }
};



const generateActivationCode = (user) => {
    const activationCode = crypto.randomInt(1000000).toString();

    const token = jwt.sign(
        { user, activationCode },
        process.env.JWT_SECRET,  // Ensure this is set in your environment variables
        { expiresIn: "1d" }      // Token expires in 1 day
    );
    return { token, activationCode };
};

// Step 1: Register User and Send Activation Code
exports.registerUserStepOne = catchAsyncErrors(async (req, res, next) => {
    const { name, username, email, password, bio, interests, isSeller, storeName, storeDescription } = req.body;

    const { profilePicBuffer, profilePicMimetype } = req.files?.profilePic ? req.files.profilePic[0] : {};
    const { storeImageBuffer, storeImageMimetype } = req.files?.storeImage ? req.files.storeImage[0] : {};

    // Validate user data
    const { error } = validateUser(req.body);
    if (error) {
        return next(new ErrorHandler(error.details[0].message, 400));
    }

    const existingEmailUser = await User.findOne({ email });
    if (existingEmailUser) {
        return next(new ErrorHandler("User already registered with this email.", 400));
    }

    const existingUsernameUser = await User.findOne({ username });
    if (existingUsernameUser) {
        return next(new ErrorHandler("Username is already taken.", 400));
    }

    // Generate activation token and code
    const user = {
        name, username, email, password, bio, interests, isSeller, storeName, storeDescription,
        profilePicBuffer, profilePicMimetype, storeImageBuffer, storeImageMimetype
    };  // Prepare a user object for token generation
    const { token: activationToken, activationCode } = generateActivationCode(user);

    // Save user details and images in session along with activation code
    req.session.userDetails = {
        name, username, email, password, bio, interests, isSeller, storeName, storeDescription,
        profilePicBuffer, profilePicMimetype, storeImageBuffer, storeImageMimetype
    };
    req.session.activationCode = activationCode;
    req.session.activationTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // Token expires in 1 day

    await sendMail({ email, template: "send-otp.ejs", data: { name, activationCode, date: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) } });  // Send activation code via email
    res.status(200).json({ message: "Activation code sent to your email.", activationToken });
});
// Step 2: Confirm Registration Using Activation Token
exports.registerUserStepTwo = catchAsyncErrors(async (req, res, next) => {
    const { activationToken, activationCode } = req.body;

    if (!activationToken || !activationCode) {
        return next(new ErrorHandler("Please provide the activation token and code.", 400));
    }

    // Retrieve session data
    // const { activationCode: sessionActivationCode, activationTokenExpire, userDetails } = req.session;

    // if (!sessionActivationCode || Date.now() > activationTokenExpire) {
    //     return next(new ErrorHandler("Activation token has expired.", 400));
    // }

    try {
        // Verify the activation token
        const decoded = jwt.verify(activationToken, process.env.JWT_SECRET);
        if (!decoded) {
            return next(new ErrorHandler("Invalid activation token.", 400));
        }

        // Check if the provided activation code matches the one stored in the session
        if (activationCode !== decoded.activationCode) {
            return next(new ErrorHandler("Invalid activation code.", 400));
        }

        const userDetails = decoded.user

        // Proceed with user registration if token and code are valid
        const hashedPassword = await bcrypt.hash(userDetails.password, 10);

        const newUser = new User({
            name: userDetails.name,
            username: userDetails.username,
            email: userDetails.email,
            password: hashedPassword,
            bio: userDetails.bio || null,
            profilePic: userDetails.profilePicBuffer || null,
            profilePicMimeType: userDetails.profilePicMimetype || null,
            interests: userDetails.interests,
            isSeller: userDetails.isSeller || false,
            storeName: userDetails.isSeller ? userDetails.storeName : null,
            storeDescription: userDetails.isSeller ? userDetails.storeDescription : null,
            storeImage: userDetails.isSeller ? userDetails.storeImageBuffer : null,
            storeImageMimeType: userDetails.isSeller ? userDetails.storeImageMimetype : null
        });

        // Generate Access Token and Refresh Token for the newly registered user
        const accessToken = generateAccessToken2({ id: newUser._id, isSeller: newUser.isSeller });
        const refreshToken = generateRefreshToken({ id: newUser._id, isSeller: newUser.isSeller });

        // Store the refresh token in an HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)  // Refresh token expires in 7 days
        });

        newUser.refreshToken = refreshToken;
        await newUser.save();

        // Set the access token in an HTTP-only cookie at the time of registration
        res.cookie('token', accessToken, {
            httpOnly: true,
            // secure: process.env.NODE_ENV === 'production', // Ensure secure cookies in production
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
        });

        // Send the access token as part of the response
        res.status(201).json({
            accessToken, // Send access token
            message: "User registered successfully.",
            newUser
        });

        // Clear session data after successful registration
        req.session.activationCode = null;
        req.session.userDetails = null;
        req.session.activationTokenExpire = null;

    } catch (error) {
        return next(new ErrorHandler("Invalid or expired activation token.", 400));
    }
});


// Refresh Token Endpoint
exports.refreshToken = catchAsyncErrors(async (req, res, next) => {
    const refreshToken = req.cookies.refreshToken; // Retrieve refresh token from cookies

    if (!refreshToken) {
        return next(new ErrorHandler("Refresh token is required.", 401));
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET); // Verify the refresh token

        // Generate a new access token
        const accessToken = generateAccessToken({ id: decoded.id, isSeller: decoded.isSeller });

        res.status(200).json({
            accessToken,
            message: "Access token refreshed successfully."
        });

    } catch (error) {
        return next(new ErrorHandler("Invalid refresh token.", 403));
    }
});
// Login User
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
    const { email, password } = req.body;

    // Check if the user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
        return next(new ErrorHandler("Invalid email or password.", 400));
    }

    console.log(user.name)

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return next(new ErrorHandler("Invalid email or password.", 400));
    }

    // Generate tokens
    const accessToken = generateAccessToken2({ id: user._id, isSeller: user.isSeller });
    console.log("hello1")
    const refreshToken = generateRefreshToken({ id: user._id, isSeller: user.isSeller });
    console.log("hello 4")

    // Set refresh token in a cookie
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
    });

    // Set the access token in an HTTP-only cookie
    res.cookie('token', accessToken, {
        httpOnly: true,
        // secure: process.env.NODE_ENV === 'production', // Ensure secure cookies in production
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
    });

    console.log("22222")

    // Respond with access token
    res.status(200).json({
        accessToken,
        message: "Logged in successfully.",
        user
    });
});

// Seller Login
exports.loginSeller = catchAsyncErrors(async (req, res, next) => {
    const { email, password } = req.body;

    // Check if the user exists and is a seller
    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.isSeller) {
        return next(new ErrorHandler("Invalid email or seller credentials.", 400));
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return next(new ErrorHandler("Invalid email or password.", 400));
    }

    // Generate tokens
    const accessToken = generateAccessToken2({ id: user._id, isSeller: user.isSeller });
    const refreshToken = generateRefreshToken({ id: user._id, isSeller: user.isSeller });

    // Set refresh token in a cookie
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
    });

    // Set the access token in an HTTP-only cookie
    res.cookie('token', accessToken, {
        httpOnly: true,
        // secure: process.env.NODE_ENV === 'production', // Ensure secure cookies in production
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
    });

    // Respond with access token
    res.status(200).json({
        accessToken,
        message: "Seller logged in successfully.",
        user
    });
});

// Logout User
exports.logoutUser = catchAsyncErrors(async (req, res, next) => {

    console.log('HELLOOOOOO');

    // Clear cookies
    res.cookie('refreshToken', null, {
        expires: new Date(Date.now()),
        httpOnly: true
    });

    res.cookie('token', null, {
        expires: new Date(Date.now()),
        httpOnly: true
    });

    res.status(200).json({ message: 'Logged out successfully.' });
});


// Get User Profile
exports.getUserProfile = catchAsyncErrors(async (req, res, next) => {
    console.log(req.user.id)
    console.log('-------------------------')

    const user = await User.findOne({ _id: req.user.id }).select('-password');

    console.log(req.user.id);
    console.log(user);



    if (!user) {
        return next(new ErrorHandler("User not found.", 404));
    }

    res.json(user);
});
exports.updateProfile = catchAsyncErrors(async (req, res, next) => {
    const { bio, name, isSeller, interests, storeName, storeDescription } = req.body;
    const { buffer: profilePicBuffer, mimetype: profilePicMimetype } = req.files?.profilePic ? req.files.profilePic[0] : {};
    const { buffer: storeImageBuffer, mimetype: storeImageMimetype } = req.files?.storeImage ? req.files.storeImage[0] : {}; // Extract store image

    const updateFields = {
        ...(bio && { bio }),
        ...(name && { name }),
        ...(isSeller !== undefined && { isSeller }),
        ...(interests && { interests }),
        ...(isSeller && storeName && { storeName }),
        ...(isSeller && storeDescription && { storeDescription }),
    };

    // Add profile picture if uploaded
    if (profilePicBuffer && profilePicMimetype) {
        updateFields.profilePic = profilePicBuffer;
        updateFields.imageMimeType = profilePicMimetype;
    }

    // Add store image if uploaded
    if (isSeller && storeImageBuffer && storeImageMimetype) {
        updateFields.storeImage = storeImageBuffer; // Assuming the User model has a storeImage field
        updateFields.storeImageMimeType = storeImageMimetype; // Assuming the User model has a storeImageMimeType field
    }

    const user = await User.findByIdAndUpdate(
        req.user.id,
        updateFields,
        { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
        return next(new ErrorHandler("User not found.", 404));
    }

    const responseMessage = user.isSeller
        ? { message: "Seller profile updated successfully", user, sellerDetails: { storeName: user.storeName, storeDescription: user.storeDescription } }
        : { message: "User profile updated successfully", user };

    res.json(responseMessage);
});





// Password Reset Request
exports.passwordResetUser = catchAsyncErrors(async (req, res, next) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

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
exports.otpVerifyUser = catchAsyncErrors(async (req, res, next) => {
    const { otp } = req.body;

    // Check if the OTP matches and has not expired
    if (otp !== req.session.otp || Date.now() > req.session.otpExpire) {
        return next(new ErrorHandler("Invalid OTP. Please try again.", 400));
    }

    // If valid, proceed with password reset or whatever the next step is
    res.status(200).json({ message: "OTP verified successfully." });

    // Clear the OTP from session after verification
    delete req.session.otp;
    delete req.session.verifiedEmail;
    delete req.session.otpExpire;
});


// Password Update
exports.passwordUpdateUser = catchAsyncErrors(async (req, res, next) => {
    const { newPassword } = req.body;

    // Check if newPassword is provided
    if (!newPassword || newPassword.trim() === "") {
        return next(new ErrorHandler("New password is required.", 400));
    }

    if (req.session.verifiedEmail) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await User.findOneAndUpdate(
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
exports.resendOtpUser = catchAsyncErrors(async (req, res, next) => {
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
const sendNotification = require('../utils/sendNotifications'); // Import the notification helper

exports.followSeller = catchAsyncErrors(async (req, res, next) => {
    const { sellerId } = req.body;
    const userId = req.user.id;

    // Check if the seller exists
    const seller = await User.findById(sellerId);
    if (!seller) {
        return next(new ErrorHandler("Seller not found.", 404));
    }

    // Check if the user is already following the seller
    if (seller.followers.includes(userId)) {
        return next(new ErrorHandler("You are already following this seller.", 400));
    }

    // Add the user to the seller's followers
    await User.findByIdAndUpdate(sellerId, { $addToSet: { followers: userId } }, { new: true });

    // Add the seller to the user's following
    await User.findByIdAndUpdate(userId, { $addToSet: { following: sellerId } }, { new: true });

    // Get the Socket.IO instance from the app
    const io = req.app.get('socketio');

    // Send the notification using the helper function
    await sendNotification(seller._id, `${req.user.id} started following you.`, 'follow', userId, null, io);

    res.status(200).json({ message: "Seller followed successfully." });
});

exports.unfollowSeller = catchAsyncErrors(async (req, res, next) => {
    const { sellerId } = req.body;
    const userId = req.user.id;

    // Check if the seller exists
    const seller = await User.findById(sellerId);
    if (!seller) {
        return next(new ErrorHandler("Seller not found.", 404));
    }

    // Check if the user is following the seller
    if (!seller.followers.includes(userId)) {
        return next(new ErrorHandler("You are not following this seller.", 400));
    }

    // Remove the user from the seller's followers
    await User.findByIdAndUpdate(sellerId, { $pull: { followers: userId } }, { new: true });

    // Remove the seller from the user's following
    await User.findByIdAndUpdate(userId, { $pull: { following: sellerId } }, { new: true });


    const io = req.app.get('socketio');
    await sendNotification(seller._id, ` ${req.user.id} unfollowed you.`, 'unfollow', userId, null, io);


    res.status(200).json({ message: "Seller unfollowed successfully." });
});

// Get Seller Profile
exports.getSellerProfile = catchAsyncErrors(async (req, res, next) => {
    const { sellerId } = req.params;

    // Check if the seller exists
    const seller = await User.findById(sellerId).select('-password');
    if (!seller) {
        return next(new ErrorHandler("Seller not found.", 404));
    }

    // Get the seller's products
    const products = await productModel.find({ user: sellerId });

    res.json({ seller, products });
});

// Get Seller Feed
exports.getSellerFeed = catchAsyncErrors(async (req, res, next) => {
    const { sellerId } = req.params;

    // Check if the seller exists
    const seller = await User.findById(sellerId);
    if (!seller) {
        return next(new ErrorHandler("Seller not found.", 404));
    }

    // Get the seller's products
    const products = await productModel.find({ user: sellerId });

    res.json({ products });
});

// Activity Feed
exports.getActivityFeed = catchAsyncErrors(async (req, res, next) => {
    const userId = req.user.id;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
        return next(new ErrorHandler("User not found.", 404));
    }

    // Get the user's following
    const following = user.following;

    // Initialize an empty array to store the activity feed
    let activityFeed = [];

    // Loop through each user the current user is following
    for (const followId of following) {
        // Find the user's activity feed
        const followUser = await User.findById(followId).populate('activityFeed');
        if (followUser) {
            // Add the follow user's activity feed to the current user's activity feed
            activityFeed = activityFeed.concat(followUser.activityFeed);
        }
    }

    // Sort the activity feed by createdAt in descending order (newest first)
    activityFeed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ activityFeed });
});



// Fetch all sellers and return only their store names
// Controller to get all stores
exports.getAllStores = async (req, res) => {
    try {
        // Find all users who are sellers and return storeName and storeImage fields
        const stores = await User.find({ isSeller: true }, 'storeName storeImage');

        // Send the response with the store names and images
        res.status(200).json({
            success: true,
            data: stores,
        });
    } catch (error) {
        console.error('Error fetching stores:', error); // Log the error for debugging
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};

exports.searchStore = catchAsyncErrors(async (req, res, next) => {
    const { storeName } = req.query; // Get the store name from query parameters

    if (!storeName) {
        return res.status(400).json({ message: "Store name is required for searching." });
    }

    try {
        // Search for sellers with a matching store name
        const stores = await User.find(
            { isSeller: true, storeName: { $regex: storeName, $options: "i" } }, 'storeName storeImage'
        );

        if (stores.length === 0) {
            return res.status(404).json({ message: "No stores found matching your search." });
        }

        res.status(200).json({
            success: true,
            data: stores
        });
    } catch (error) {
        console.error("Error in searching stores:", error);
        next(new ErrorHandler("Something went wrong while searching for stores.", 500));
    }
});

