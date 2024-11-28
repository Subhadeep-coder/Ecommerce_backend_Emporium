const express = require('express');
const { registerDeliveryAgent, verifyDeliveryAgent, loginDeliveryAgent } = require('../controllers/deliveryAgentController');
const upload = require("../config/multer-config");
const deliveryAgentRouter = express.Router();

deliveryAgentRouter.post('/signup', upload.fields([
    { name: "profilePic", maxCount: 1 },  // Upload single profile picture
    { name: "storeImage", maxCount: 1 }    // Upload single store image
]), registerDeliveryAgent);
deliveryAgentRouter.post('/verify', verifyDeliveryAgent);
deliveryAgentRouter.post('/login', loginDeliveryAgent);

module.exports = deliveryAgentRouter;