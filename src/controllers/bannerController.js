const Banner = require('../models/bannerModel');
const { catchAsyncErrors } = require("../middlewares/catchAsyncError");
const ErrorHandler = require("../utils/ErrorHandler");

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });


exports.getBanner = catchAsyncErrors(async (req, res, next) => {
    try {
        const banner = await Banner.findOne();
        if (banner) {
            res.set('Content-Type', banner.contentType);
            res.send(banner.image);
        } else {
            res.status(404).json({ error: 'Banner not found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

exports.uploadBanner = upload.single('image');

exports.updateBanner = catchAsyncErrors(async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { buffer, mimetype } = req.file;

        let banner = await Banner.findOne();
        if (banner) {
            banner.image = buffer;
            banner.contentType = mimetype;
        } else {
            banner = new Banner({
                image: buffer,
                contentType: mimetype,
            });
        }

        await banner.save();

        res.status(200).json({ message: 'Banner updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
