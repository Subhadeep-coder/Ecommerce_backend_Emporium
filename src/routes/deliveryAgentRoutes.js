const express = require('express');
const { registerDeliveryAgent, verifyDeliveryAgent, loginDeliveryAgent, getDeliveryAgentProfile, getNearestOrders, assignOrder, getOrderDetails, markOrderAsDelivered, verifyGoogleToken } = require('../controllers/deliveryAgentController');
const upload = require("../config/multer-config");
const { isLoggedIn } = require('../middlewares/checkAuth');
const passport = require("passport");
const deliveryAgentRouter = express.Router();

deliveryAgentRouter.post('/signup', upload.fields([
    { name: "profilePic", maxCount: 1 },
    { name: "storeImage", maxCount: 1 }
]), registerDeliveryAgent);
deliveryAgentRouter
deliveryAgentRouter.post('/verify', verifyDeliveryAgent);
deliveryAgentRouter.post('/login', loginDeliveryAgent);
deliveryAgentRouter.get('/profile', isLoggedIn, getDeliveryAgentProfile);
deliveryAgentRouter.get('/get-nearest-orders', isLoggedIn, getNearestOrders);
deliveryAgentRouter.post('/assign-order', isLoggedIn, assignOrder);
deliveryAgentRouter.get('/get-current-order', isLoggedIn, getOrderDetails);
deliveryAgentRouter.put('/update-delivery-status/:orderId', isLoggedIn, markOrderAsDelivered);
deliveryAgentRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

deliveryAgentRouter.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    const token = req.user.token;

    if (req.headers["user-agent"].includes("Mobile") || req.query.mobile) {
      res.redirect(`com.myapp://auth?token=${token}`);
    } else {
      res.cookie("token", token, { httpOnly: true });
      res.redirect("/dashboard");
    }
  }
);

deliveryAgentRouter.get("/dashboard", (req, res) => {
  if (!req.user) {
    return res.redirect("/");
  }
  res.send({ agent: req.user });
});

deliveryAgentRouter.get("/logout", (req, res) => {
  res.clearCookie("token");
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

deliveryAgentRouter.post('/verifyToken', verifyGoogleToken);

module.exports = deliveryAgentRouter;