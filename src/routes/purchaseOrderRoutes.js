const express = require('express');
const router = express.Router();
const PurchaseOrder = require('../models/PurchaseOrder');

// GET /api/purchase-orders - Get all purchase orders
router.get('/', async (req, res) => {
  try {
    const orders = await PurchaseOrder.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/purchase-orders - Create new purchase order
router.post('/', async (req, res) => {
  try {
    const orderNo = `PO-${Date.now().toString().slice(-5)}`;
    const po = new PurchaseOrder({ orderNo, ...req.body });
    await po.save();
    res.status(201).json(po);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/purchase-orders/:id/status - Update order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const update = { status };
    if (status === 'Received') update.receivedDate = new Date();
    const po = await PurchaseOrder.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!po) return res.status(404).json({ message: 'Purchase Order not found' });
    res.json(po);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
