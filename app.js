require('dotenv').config()

const express = require("express")
const app = express()
const userRouter = require("./src/routes/userRoutes")
const adminRouter = require("./src/routes/adminRoutes")
const db = require("./src/config/mongoose-connection")
const cookieParser = require('cookie-parser');
const productRouter = require("./src/routes/productRoutes")
const cartRouter = require("./src/routes/cartRoutes")
const orderRouter = require("./src/routes/orderRoutes")
const paymentRouter = require("./src/routes/paymentRoutes")

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const googleAuthRoutes = require("./src/routes/google-auth-Routes")
const googleauth = require("./src/utils/googleAuth")
googleauth()

const expressSession = require('express-session')

app.use(expressSession({
    resave: false,
    saveUninitialized: false,
    secret: process.env.SECRET_KEY,
   
}))

app.use("/", userRouter)
app.use("/admin", adminRouter)
app.use("/product", productRouter)
app.use('/cart', cartRouter);
app.use('/order', orderRouter);
app.use('/payment', paymentRouter);




app.use("/auth", googleAuthRoutes)





app.listen(process.env.PORT || 3000, () =>{
    console.log("server is running");
    
})