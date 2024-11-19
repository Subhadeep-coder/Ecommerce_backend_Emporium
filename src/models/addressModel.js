const mongoose = require('mongoose');

// Address Schema
const addressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  // Referencing the User model
        required: true
    },
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    zipCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false }  // To mark an address as the default
}, {
    timestamps: true   // Automatically adds createdAt and updatedAt
});

const Address = mongoose.model('Address', addressSchema);
module.exports = Address;
