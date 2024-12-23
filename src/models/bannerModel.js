const mongoose = require('mongoose');

const BannerSchema = new mongoose.Schema({
    image: { type: Buffer, required: true },
    contentType: { type: String, required: true },
});

module.exports = mongoose.model('Banner', BannerSchema);
