const express = require('express');
const router = express.Router();
const adsController = require('../controllers/adsController');

// Routes
router.get('/getAds', adsController.getAds); // Fetch all ads
router.post(
  '/addAd',
  adsController.uploadAdImage,
  adsController.addAd
); // Add a new ad
router.delete('/deleteAd/:index', adsController.deleteAd); // Delete an ad by index

module.exports = router;
