const express = require('express');
const { registerDeliveryAgent, verifyDeliveryAgent, loginDeliveryAgent } = require('../controllers/deliveryAgentController');
const deliveryAgentRouter = express.Router();

deliveryAgentRouter.post('/signup', registerDeliveryAgent);
deliveryAgentRouter.post('/verify', verifyDeliveryAgent);
deliveryAgentRouter.post('/login', loginDeliveryAgent);

module.exports = deliveryAgentRouter;