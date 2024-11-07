require('dotenv').config();
const express = require('express');
const http = require('http'); // Required for setting up Socket.IO with Express
const { Server } = require('socket.io'); // Importing Socket.IO
const cookieParser = require('cookie-parser');
const expressSession = require('express-session');

// Importing routers
const userRouter = require("./src/routes/userRoutes");
const adminRouter = require("./src/routes/adminRoutes");
const productRouter = require("./src/routes/productRoutes");
const cartRouter = require("./src/routes/cartRoutes");
const orderRouter = require("./src/routes/orderRoutes");
const paymentRouter = require("./src/routes/paymentRoutes");
const googleAuthRoutes = require("./src/routes/google-auth-Routes");
const messageRoutes = require("./src/routes/messageRoutes");
const MongoStore = require('connect-mongo');

// Import database connection and Socket.IO setup
const db = require("./src/config/mongoose-connection");
const { setupSocket } = require('./src/utils/socket-io');

// Connect to MongoDB
const app = express();

// Creating HTTP server from the Express app
const server = http.createServer(app);

// Initializing Socket.IO with the HTTP server
const io = new Server(server);

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express session
app.use(expressSession({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI, // Your MongoDB connection URL
        collectionName: 'sessions'
    })
}));

// Setup Socket.IO with the existing function
setupSocket(io);

// Define routes
app.use("/", userRouter);
app.use("/admin", adminRouter);
app.use("/product", productRouter);
app.use("/cart", cartRouter);
app.use("/order", orderRouter);
app.use("/payment", paymentRouter);
app.use("/auth", googleAuthRoutes);
app.use("/meesages", messageRoutes);

// Server listens on the specified port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}..`);
});
