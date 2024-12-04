require('dotenv').config();
const express = require('express');
const http = require('http'); // Required for setting up Socket.IO with Express
const { Server } = require('socket.io'); // Importing Socket.IO
const cookieParser = require('cookie-parser');
const expressSession = require('express-session');
const cors = require("cors");

// Importing routers
const userRouter = require("./src/routes/userRoutes");
const adminRouter = require("./src/routes/adminRoutes");
const productRouter = require("./src/routes/productRoutes");
const cartRouter = require("./src/routes/cartRoutes");
const orderRouter = require("./src/routes/orderRoutes");
const cashRouter = require("./src/routes/cashondeliveryRoutes");
const paymentRouter = require("./src/routes/paymentRoutes");
const googleAuthRoutes = require("./src/routes/google-auth-Routes");
const messageRoutes = require("./src/routes/messageRoutes");
const addressRoutes = require("./src/routes/addressRoutes");
const deliveryAgentRoutes = require("./src/routes/deliveryAgentRoutes");
const MongoStore = require('connect-mongo');

// Import database connection and Socket.IO setup
const db = require("./src/config/mongoose-connection");
const { setupSocket } = require('./src/utils/socket-io');

// Connect to MongoDB
const app = express();

// Creating HTTP server from the Express app
const server = http.createServer(app);

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS setup for Express
app.use(cors({
    origin: "*", // Your frontend origin (e.g., "http://localhost:3000")
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
    credentials: true // Allow credentials (cookies, etc.)
}));

// Express session
app.use(expressSession({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI, // Your MongoDB connection URL
        collectionName: 'sessions'
    }),
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Set to true in production
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    }
}));

// Initializing Socket.IO on the HTTP server with CORS settings
// const io = new Server(server, {
//     cors: {
//         origin: process.env.CLIENT_URL,  // Your frontend origin (e.g., "http://localhost:3000")
//         methods: ["GET", "POST"],
//         credentials: true // Allow credentials for Socket.IO
//     }
// });

// Setup Socket.IO with the existing function
// setupSocket(io);

// Define routes
app.use("/", userRouter);
app.use("/admin", adminRouter);
app.use("/product", productRouter);
app.use("/cart", cartRouter);
app.use("/order", orderRouter);
app.use("/payment", paymentRouter);
app.use("/auth", googleAuthRoutes);
app.use("/messages", messageRoutes);  // Fixed the typo from "meesages"
app.use("/cash", cashRouter);
app.use("/address", addressRoutes);
app.use("/delivery-agent", deliveryAgentRoutes);

// Server listens on the specified port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}..`);
});
