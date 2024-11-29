const express = require('express');
const { registerDeliveryAgent, verifyDeliveryAgent, loginDeliveryAgent, getDeliveryAgentProfile, getNearestOrders, assignOrder } = require('../controllers/deliveryAgentController');
const upload = require("../config/multer-config");
const { isLoggedIn } = require('../middlewares/checkAuth');
const deliveryAgentRouter = express.Router();

deliveryAgentRouter.post('/signup', upload.fields([
    { name: "profilePic", maxCount: 1 },
    { name: "storeImage", maxCount: 1 }
]), registerDeliveryAgent);
deliveryAgentRouter.post('/verify', verifyDeliveryAgent);
deliveryAgentRouter.post('/login', loginDeliveryAgent);
deliveryAgentRouter.get('/profile', isLoggedIn, getDeliveryAgentProfile);
deliveryAgentRouter.get('/get-nearest-orders', isLoggedIn, getNearestOrders);
deliveryAgentRouter.post('/assign-order', isLoggedIn, assignOrder);

module.exports = deliveryAgentRouter;