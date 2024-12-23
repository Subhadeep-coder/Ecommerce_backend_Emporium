const mongoose = require('mongoose');

const AdsSchema = new mongoose.Schema({
  ads: [
    {
      storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
      storeName: { type: String, required: true },
      image: { type: Buffer, required: true },
      contentType: { type: String, required: true },
    },
  ],
});

module.exports = mongoose.model('Ads', AdsSchema);
