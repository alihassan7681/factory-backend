const express = require('express');
const router = express.Router();
const ProductionLog = require('../models/ProductionLog');
const Product = require('../models/Product');

// GET /api/production - Get production run history
router.get('/', async (req, res) => {
  try {
    const logs = await ProductionLog.find().sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/production - Add new daily production run & increment warehouse stock
router.post('/', async (req, res) => {
  try {
    const { productId, productName, quantity, notes } = req.body;
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      return res.status(400).json({ message: 'Valid quantity required' });
    }

    let product = null;
    if (productId && productId.length === 24) {
      product = await Product.findById(productId);
    }
    if (!product && (productName || productId)) {
      product = await Product.findOne({ $or: [{ name: productName }, { _id: productId }] });
    }

    if (product) {
      product.currentStock += qty;
      await product.save();
    }

    // 2. Save log
    const log = new ProductionLog({
      productId: product ? product._id.toString() : (productId || 'prod-custom'),
      productName: product ? product.name : (productName || 'Custom Product'),
      quantity: qty,
      unit: product ? product.unit : 'Kg',
      notes: notes || 'Daily Production Run',
      date: new Date().toISOString(),
    });
    await log.save();

    res.status(201).json({
      message: `Added ${qty} units to production!`,
      log,
      updatedProduct: product,
    });
  } catch (err) {
    console.error('Production error:', err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
