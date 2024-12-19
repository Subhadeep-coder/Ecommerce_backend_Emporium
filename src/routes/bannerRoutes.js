const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');

// GET BANNER
router.get('/getBanner', bannerController.getBanner)

// UPDATE BANNER
router.post(
    '/updateBanner',
    bannerController.uploadBanner,
    bannerController.updateBanner
  );

module.exports = router;
