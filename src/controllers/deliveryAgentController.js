const { catchAsyncErrors } = require("../middlewares/catchAsyncError");
const DeliveryAgentModel = require("../models/deliveryAgentModel");

// Step 1: Register User and Send Activation Code
exports.registerDeliveryAgent = catchAsyncErrors(async (req, res, next) => {
    const { name, phoneNumber, email, password } = req.body;

    const { profilePicBuffer, profilePicMimetype } = req.files?.profilePic ? req.files.profilePic[0] : {};
    const { storeImageBuffer, storeImageMimetype } = req.files?.storeImage ? req.files.storeImage[0] : {};

    // Validate user data
    const { error } = validateUser(req.body);
    if (error) {
        return next(new ErrorHandler(error.details[0].message, 400));
    }

    const existingEmailUser = await DeliveryAgentModel.findOne({ email });
    if (existingEmailUser) {
        return next(new ErrorHandler("User already registered with this email.", 400));
    }

    // Generate activation token and code
    const user = { name, phoneNumber, email, password };  // Prepare a user object for token generation
    const { token: activationToken, activationCode } = generateActivationCode(user);
    console.log(activationCode);
    // await sendMail(email, activationCode);  // Send activation code via email
    res.status(200).json({ message: "Activation code sent to your email.", activationToken });
});

// Step 2: Confirm Registration Using Activation Token
exports.verifyDeliveryAgent = catchAsyncErrors(async (req, res, next) => {
    const { activationToken, activationCode } = req.body;

    if (!activationToken || !activationCode) {
        return next(new ErrorHandler("Please provide the activation token and code.", 400));
    }

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

        const userDetails = decoded.user;

        // Proceed with user registration if token and code are valid
        const hashedPassword = await bcrypt.hash(userDetails.password, 10);

        const newUser = new DeliveryAgentModel({
            name: userDetails.name,
            email: userDetails.email,
            password: hashedPassword,
        });

        // Generate Access Token and Refresh Token for the newly registered user
        const accessToken = generateAccessToken2({ id: newUser._id, isSeller: newUser.isSeller });
        // const refreshToken = generateRefreshToken({ id: newUser._id, isSeller: newUser.isSeller });

        // Store the refresh token in an HTTP-only cookie
        // res.cookie('refreshToken', refreshToken, {
        //     httpOnly: true,
        //     expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)  // Refresh token expires in 7 days
        // });

        // newUser.refreshToken = refreshToken;
        // await newUser.save();

        // Set the access token in an HTTP-only cookie at the time of registration
        // res.cookie('token', accessToken, {
        //     httpOnly: true,
        //     // secure: process.env.NODE_ENV === 'production', // Ensure secure cookies in production
        //     expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
        // });

        // Send the access token as part of the response
        res.status(201).json({
            accessToken, // Send access token
            message: "User registered successfully.",
            newUser
        });

        // // Clear session data after successful registration
        // req.session.activationCode = null;
        // req.session.userDetails = null;
        // req.session.activationTokenExpire = null;

    } catch (error) {
        return next(new ErrorHandler("Invalid or expired activation token.", 400));
    }
});

// Login User
exports.loginDeliveryAgent = catchAsyncErrors(async (req, res, next) => {
    const { email, password } = req.body;

    // Check if the user exists
    const user = await DeliveryAgentModel.findOne({ email }).select('+password');
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