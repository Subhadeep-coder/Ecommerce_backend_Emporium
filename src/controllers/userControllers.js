const bcrypt = require('bcrypt');
const { User, validateUser } = require('../models/userModel'); // Import the User model and validation
const {productModel, productValidation } = require('../models/productModel'); // Import the Product model and validation
const { catchAsyncErrors } = require("../middlewares/catchAsyncError");
const ErrorHandler = require("../utils/ErrorHandler");
const { generateToken } = require("../utils/SendToken");  
const sendMail = require("../utils/nodemailer")
const crypto = require("crypto")
// Import the token generation function
exports.test = (req, res, next) =>{
    res.json({ message: 'hello user' });

}
exports.registerUserStepOne = catchAsyncErrors(async (req, res, next) => {
    const { name, username, email, password, bio, interests, isSeller, storeName, storeDescription } = req.body;
    
    // Separate uploads for profile picture and store image (if seller)
    const { profilePicBuffer, profilePicMimetype } = req.files?.profilePic ? req.files.profilePic[0] : {};  // Profile pic
    const { storeImageBuffer, storeImageMimetype } = req.files?.storeImage ? req.files.storeImage[0] : {};  // Store image (if seller)

    // Validate user data
    const { error } = validateUser(req.body);
    if (error) {
        return next(new ErrorHandler(error.details[0].message, 400));
    }

    // Check if email already exists
    const existingEmailUser = await User.findOne({ email });
    if (existingEmailUser) {
        return next(new ErrorHandler("User already registered with this email.", 400));
    }

    // Check if username already exists
    const existingUsernameUser = await User.findOne({ username });
    if (existingUsernameUser) {
        return next(new ErrorHandler("Username is already taken.", 400));
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    
    // Save user details and images in session
    req.session.userDetails = { 
        name, 
        username, 
        email, 
        password, 
        bio, 
        interests, 
        isSeller, 
        storeName, 
        storeDescription, 
        profilePicBuffer,  // Profile image buffer
        profilePicMimetype,  // Profile image mimetype
        storeImageBuffer,  // Store image buffer (if seller)
        storeImageMimetype  // Store image mimetype (if seller)
    };
    
    req.session.otp = otp;
    req.session.otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    await sendMail(email, otp);
    res.status(200).json({ message: "OTP sent to your email." });
});


exports.registerUserStepTwo = catchAsyncErrors(async (req, res, next) => {
    const { otp } = req.body;

    if (!otp) {
        return next(new ErrorHandler("Please provide an OTP.", 400));
    }

    const { otp: sessionOtp, otpExpire, userDetails } = req.session;

    if (!sessionOtp) {
        return next(new ErrorHandler("No OTP found in session.", 400));
    }

    if (Date.now() > otpExpire) {
        return next(new ErrorHandler("OTP has expired.", 400));
    }

    const trimmedSessionOtp = String(sessionOtp).trim();
    const trimmedInputOtp = String(otp).trim();

    if (trimmedInputOtp !== trimmedSessionOtp) {
        return next(new ErrorHandler("Invalid OTP.", 400));
    }

    // Proceed with user registration if OTP is valid
    const hashedPassword = await bcrypt.hash(userDetails.password, 10);

    const newUser = new User({
        name: userDetails.name,
        username: userDetails.username,
        email: userDetails.email,
        password: hashedPassword,
        bio: userDetails.bio || null,
        
        // Save profile image buffer and mimetype
        profilePic: userDetails.profilePicBuffer || null,  
        profilePicMimeType: userDetails.profilePicMimetype || null,  

        interests: userDetails.interests,
        isSeller: userDetails.isSeller || false,

        // Save store details and store image if user is a seller
        storeName: userDetails.isSeller ? userDetails.storeName : null,
        storeDescription: userDetails.isSeller ? userDetails.storeDescription : null,
        storeImage: userDetails.isSeller ? userDetails.storeImageBuffer : null,
        storeImageMimeType: userDetails.isSeller ? userDetails.storeImageMimetype : null
    });

    await newUser.save();

    // Generate JWT token
    const token = generateToken(newUser._id, false, newUser.isSeller, newUser._id);
    res.cookie('token', token, { httpOnly: true, expires: new Date(Date.now() + 60 * 60 * 1000) });

    // Clear session data
    req.session.otp = null;
    req.session.userDetails = null;
    req.session.otpExpire = null;

    res.status(201).json({ token, message: "User registered successfully.", newUser });
});

// User Login
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
    const { email, password } = req.body;

    // Check if the user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
        return next(new ErrorHandler("Invalid email or password.", 400));
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return next(new ErrorHandler("Invalid email or password.", 400));
    }

    // Create JWT Token
    const token = generateToken(user._id, false, user.isSeller, user._id); // Set isAdmin to false for users

    // Set the token in a cookie (optional)
    res.cookie('token', token, {
        httpOnly: true,
        expires: new Date(Date.now() + 60 * 60 * 1000), // Cookie expires in 1 hour
    });

    res.json({ token, message: "Logged in successfully." , user});
});

// User Logout
exports.logoutUser = catchAsyncErrors(async (req, res, next) => {
    res.cookie('token', null, {
        expires: new Date(Date.now()), // Expire cookie immediately
        httpOnly: true,
    });
    res.status(200).json({ message: "Logged out successfully." });
});

// Get User Profile
exports.getUserProfile = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('-password'); // Use req.user.id after login middleware
    console.log(req.user.id);
    

    if (!user) {
        return next(new ErrorHandler("User not found.", 404));
    }

    res.json(user);
});
exports.updateProfile = catchAsyncErrors(async (req, res, next) => {
    const { bio, name, isSeller, interests, storeName, storeDescription } = req.body;
    const { buffer: profilePicBuffer, mimetype: profilePicMimetype } = req.file || {};
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

// Follow Seller
exports.followSeller = catchAsyncErrors(async (req, res, next) => {
    const { sellerId } = req.body;
    console.log(sellerId);
    
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

    res.status(200).json({ message: "Seller followed successfully." });
});

// Unfollow Seller
exports.unfollowSeller = catchAsyncErrors(async (req, res, next) => {
    const { sellerId } = req.body;
    const userId = req.user.id;

    // Check if the seller exists
    const seller = await User.findById(sellerId);
    if (!seller) {
        return next(new ErrorHandler("Seller not found.", 404));
    }

    // Check if the user is not following the seller
    if (!seller.followers.includes(userId)) {
        return next(new ErrorHandler("You are not following this seller.", 400));
    }

    // Remove the user from the seller's followers
    await User.findByIdAndUpdate(sellerId, { $pull: { followers: userId } }, { new: true });

    // Remove the seller from the user's following
    await User.findByIdAndUpdate(userId, { $pull: { following: sellerId } }, { new: true });

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
