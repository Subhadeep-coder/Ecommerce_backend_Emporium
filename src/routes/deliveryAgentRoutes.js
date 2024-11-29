const express = require('express');
const { registerDeliveryAgent, verifyDeliveryAgent, loginDeliveryAgent, getDeliveryAgentProfile } = require('../controllers/deliveryAgentController');
const upload = require("../config/multer-config");
const { isLoggedIn } = require('../middlewares/checkAuth');
const deliveryAgentRouter = express.Router();

deliveryAgentRouter.post('/signup', upload.fields([
    { name: "profilePic", maxCount: 1 },  // Upload single profile picture
    { name: "storeImage", maxCount: 1 }    // Upload single store image
]), registerDeliveryAgent);
deliveryAgentRouter.post('/verify', verifyDeliveryAgent);
deliveryAgentRouter.post('/login', loginDeliveryAgent);
deliveryAgentRouter.get('/profile', isLoggedIn, getDeliveryAgentProfile);

module.exports = deliveryAgentRouter;