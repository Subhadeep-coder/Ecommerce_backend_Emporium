const Ads = require('../models/adsModel');
const mongoose = require('mongoose');
const {User} = require('../models/userModel');
const { catchAsyncErrors } = require("../middlewares/catchAsyncError");
const ErrorHandler = require("../utils/ErrorHandler");

exports.getAds = catchAsyncErrors(async (req, res, next) => {
  try {
    const adsDoc = await Ads.findOne().populate('ads.storeId');
    if (adsDoc && adsDoc.ads.length > 0) {
        const ads = await Promise.all(
          adsDoc.ads.map(async (ad) => {
            const store = await User.find(
              { 
                isSeller: true, 
                _id: new mongoose.Types.ObjectId(ad.storeId)
              },
              'storeName storeImage'
            );
      
            if (store.length > 0) {
              return {
                titleText: ad.titleText,
                storeName: ad.storeName,
                image: ad.image.toString('base64'),
                contentType: ad.contentType,
                store: store[0]
              };
            } else {
              return {
                titleText: ad.titleText,
                storeName: ad.storeName,
                image: ad.image.toString('base64'),
                contentType: ad.contentType,
                store: null
              };
            }
          })
        );
      
        res.status(200).json(ads);
      } else {
        res.status(404).json({ error: 'No ads found' });
      }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

exports.uploadAdImage = upload.single('image');

exports.addAd = catchAsyncErrors(async (req, res, next) => {
  try {
    const { storeId, storeName, titleText } = req.body;
    if (!req.file || !storeId || !storeName || !titleText) {
      return res
        .status(400)
        .json({ error: 'Store ID, Store Name, a Title and Image are required' });
    }

    const storeIdObjectId = new mongoose.Types.ObjectId(storeId);

    const { buffer, mimetype } = req.file;

    let adsDoc = await Ads.findOne();
    if (!adsDoc) {
      adsDoc = new Ads({ ads: [] });
    }

    adsDoc.ads.push({
      titleText: titleText,
      storeId: storeIdObjectId,
      storeName,
      image: buffer,
      contentType: mimetype,
    });

    await adsDoc.save();

    res.status(201).json({ message: 'Ad added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

exports.deleteAd = catchAsyncErrors(async (req, res, next) => {
    try {
      const { index } = req.params;
  
      let adsDoc = await Ads.findOne();
      if (!adsDoc || index < 0 || index >= adsDoc.ads.length) {
        return res.status(404).json({ error: 'Ad not found' });
      }
  
      adsDoc.ads.splice(index, 1); // Remove the ad at the specified index
      await adsDoc.save();
  
      res.status(200).json({ message: 'Ad deleted successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  