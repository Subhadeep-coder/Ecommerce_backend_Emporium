const Cart = require('../models/cartModel');
const { productModel } = require('../models/productModel');
const { User } = require('../models/userModel');
const { catchAsyncErrors } = require("../middlewares/catchAsyncError");
const ErrorHandler = require("../utils/ErrorHandler");

// Add product to cart
exports.addToCart = catchAsyncErrors(async (req, res, next) => {
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;

    let cart = await Cart.findOne({ userId });
    const product = await productModel.findById(productId);

    if (!product) {
        return next(new ErrorHandler('Product not found', 404));
    }

    if (!cart) {
        cart = await Cart.create({
            userId,
            products: [{ productId, quantity }],
            totalAmount: product.price * quantity
        });
    } else {
        const existingProduct = cart.products.find(item => item.productId.toString() === productId);

        if (existingProduct) {
            existingProduct.quantity += quantity;
        } else {
            cart.products.push({ productId, quantity });
        }

        cart.totalAmount = await calculateTotalAmount(cart);
        await cart.save();
    }

    res.status(200).json({
        success: true,
        message: 'Product added to cart successfully',
        cart
    });
});

// Get cart details
exports.getCart = catchAsyncErrors(async (req, res, next) => {
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId }).populate('products.productId');

    if (!cart) {
        return next(new ErrorHandler('Cart not found', 404));
    }

    res.status(200).json({
        success: true,
        cart
    });
});

// Update product quantity in the cart
exports.updateQuantity = catchAsyncErrors(async (req, res, next) => {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
        return next(new ErrorHandler('Cart not found', 404));
    }

    const product = cart.products.find(item => item.productId.toString() === productId);

    if (!product) {
        return next(new ErrorHandler('Product not found in cart', 404));
    }

    product.quantity = quantity;
    cart.totalAmount = await calculateTotalAmount(cart);
    await cart.save();

    res.status(200).json({
        success: true,
        message: 'Cart updated successfully',
        cart
    });
});

// Remove product from cart
exports.removeFromCart = catchAsyncErrors(async (req, res, next) => {
    const userId = req.user.id;
    const { productId } = req.params;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
        return next(new ErrorHandler('Cart not found', 404));
    }

    cart.products = cart.products.filter(item => item.productId.toString() !== productId);
    cart.totalAmount = await calculateTotalAmount(cart);
    await cart.save();

    res.status(200).json({
        success: true,
        message: 'Product removed from cart successfully',
        cart
    });
});

// Save item for later
exports.saveForLater = catchAsyncErrors(async (req, res, next) => {
    const userId = req.user.id;
    const { productId } = req.params;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
        return next(new ErrorHandler('Cart not found', 404));
    }

    const productIndex = cart.products.findIndex(item => item.productId.toString() === productId);

    if (productIndex === -1) {
        return next(new ErrorHandler('Product not found in cart', 404));
    }

    const [product] = cart.products.splice(productIndex, 1);
    cart.savedForLater.push(product);
    cart.totalAmount = await calculateTotalAmount(cart);
    await cart.save();

    res.status(200).json({
        success: true,
        message: 'Item saved for later successfully',
        cart
    });
});

// Move item from saved for later to cart
exports.moveToCart = catchAsyncErrors(async (req, res, next) => {
    const userId = req.user.id;
    const { productId } = req.params;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
        return next(new ErrorHandler('Cart not found', 404));
    }

    const savedItemIndex = cart.savedForLater.findIndex(item => item.productId.toString() === productId);

    if (savedItemIndex === -1) {
        return next(new ErrorHandler('Product not found in saved items', 404));
    }

    const [item] = cart.savedForLater.splice(savedItemIndex, 1);
    cart.products.push(item);
    cart.totalAmount = await calculateTotalAmount(cart);
    await cart.save();

    res.status(200).json({
        success: true,
        message: 'Item moved to cart successfully',
        cart
    });
});

// Add item to lookbook
exports.addToLookbook = catchAsyncErrors(async (req, res, next) => {
    const userId = req.user.id;
    const { productId } = req.params;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
        return next(new ErrorHandler('Cart not found', 404));
    }

    if (!cart.lookbook.some(item => item.productId.toString() === productId)) {
        cart.lookbook.push({ productId });
        await cart.save();
    }

    res.status(200).json({
        success: true,
        message: 'Item added to lookbook successfully',
        cart
    });
});

// Remove item from lookbook
exports.removeFromLookbook = catchAsyncErrors(async (req, res, next) => {
    const userId = req.user.id;
    const { productId } = req.params;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
        return next(new ErrorHandler('Cart not found', 404));
    }

    cart.lookbook = cart.lookbook.filter(item => item.productId.toString() !== productId);
    await cart.save();

    res.status(200).json({
        success: true,
        message: 'Item removed from lookbook successfully',
        cart
    });
});

// Helper function to calculate total amount
async function calculateTotalAmount(cart) {
    let total = 0;
    for (const item of cart.products) {
        const product = await productModel.findById(item.productId);
        if (product) {
            total += product.price * item.quantity;
        }
    }
    return total;
}

exports.test = (req, res) => {
    res.json({ message: "Test route for cart" });
};
