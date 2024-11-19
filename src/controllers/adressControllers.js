const Address = require('../models/addressModel');  // Import Address model
const User = require('../models/userModel');  // Import User model

// Add Address Controller
const addAddress = async (req, res) => {
    const { street, city, state, zipCode, country, isDefault } = req.body;

    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).send('User not found');

        // If isDefault is true, set all other addresses for this user to isDefault: false
        if (isDefault) {
            await Address.updateMany({ user: req.user._id }, { isDefault: false });
        }

        // Create and save the new address
        const address = new Address({
            user: req.user.id,
            street,
            city,
            state,
            zipCode,
            country,
            isDefault
        });

        await address.save();
        res.status(200).send('Address added successfully');
    } catch (error) {
        res.status(500).send('Server error');
    }
};

// Update Address Controller
const updateAddress = async (req, res) => {
    const { addressId } = req.params;
    const { street, city, state, zipCode, country, isDefault } = req.body;

    try {
        const address = await Address.findById(addressId);
        if (!address) return res.status(404).send('Address not found');

        // Check if the address belongs to the authenticated user
        if (address.user.toString() !== req.user._id.toString()) {
            return res.status(403).send('Unauthorized');
        }

        // Update address fields
        address.street = street || address.street;
        address.city = city || address.city;
        address.state = state || address.state;
        address.zipCode = zipCode || address.zipCode;
        address.country = country || address.country;

        // Handle isDefault
        if (isDefault) {
            await Address.updateMany({ user: req.user._id }, { isDefault: false });
            address.isDefault = true;
        } else {
            address.isDefault = isDefault;
        }

        await address.save();
        res.status(200).send('Address updated successfully');
    } catch (error) {
        res.status(500).send('Server error');
    }
};

// Get All Addresses for User Controller
const getAddresses = async (req, res) => {
    try {
        const addresses = await Address.find({ user: req.user._id });
        if (!addresses || addresses.length === 0) return res.status(404).send('No addresses found');

        res.status(200).json(addresses);
    } catch (error) {
        res.status(500).send('Server error');
    }
};

module.exports = {
    addAddress,
    updateAddress,
    getAddresses
};
