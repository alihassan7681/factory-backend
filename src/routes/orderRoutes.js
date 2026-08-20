const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');

// GET /api/orders - Get all sales orders / invoices
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders - Checkout sale & create invoice
router.post('/', async (req, res) => {
  try {
    const {
      id,
      invoiceNo,
      customerId,
      customerName,
      customerContact,
      items = [],
      totalAmount,
      advancePaid,
      remainingBalance,
      dueDate,
      promiseDays,
      paymentHistory,
      date,
    } = req.body;

    const finalInvoiceNo = id || invoiceNo || `INV-${Date.now().toString().slice(-5)}`;
    const advance = Number(advancePaid) || 0;
    const total = Number(totalAmount) || 0;
    const balance = remainingBalance !== undefined ? Number(remainingBalance) : Math.max(0, total - advance);
    const status = balance === 0 ? 'Paid' : advance > 0 ? 'Partial' : 'Pending';

    const order = new Order({
      invoiceNo: finalInvoiceNo,
      customerId: customerId || null,
      customerName: customerName || 'Walk-in Customer',
      customerContact: customerContact || '',
      items: items.map((item) => ({
        productId: item.productId || item.id,
        name: item.name,
        unit: item.unit || 'Kg',
        qty: Number(item.qty) || 1,
        price: Number(item.price) || 0,
        costPrice: Number(item.costPrice) || 0,
        subtotal: Number(item.subtotal || item.price * item.qty) || 0,
      })),
      totalAmount: total,
      advancePaid: advance,
      remainingBalance: balance,
      dueDate: dueDate || null,
      promiseDays: promiseDays || 0,
      status,
      paymentHistory:
        paymentHistory || (advance > 0 ? [{ amount: advance, date: new Date().toISOString(), note: 'Advance on Counter' }] : []),
      orderDate: date || new Date().toISOString(),
    });

    // 1. Customer Upsert (Ensure customer is ALWAYS saved in MongoDB)
    if (customerName && customerName.trim()) {
      try {
        let existingCustomer = null;

        if (customerId && customerId.length === 24) {
          existingCustomer = await Customer.findById(customerId);
        }
        if (!existingCustomer) {
          existingCustomer = await Customer.findOne({
            name: { $regex: new RegExp(`^${customerName.trim()}$`, 'i') },
          });
        }

        if (existingCustomer) {
          // Update existing customer stats
          existingCustomer.totalPurchased = (Number(existingCustomer.totalPurchased) || 0) + total;
          existingCustomer.totalPaid = (Number(existingCustomer.totalPaid) || 0) + advance;
          existingCustomer.remainingBalance = (Number(existingCustomer.remainingBalance) || 0) + balance;
          if (customerContact && !existingCustomer.contact) {
            existingCustomer.contact = customerContact;
          }
          await existingCustomer.save();
          order.customerId = existingCustomer._id.toString();
        } else {
          // Create new customer account in MongoDB
          const newCust = new Customer({
            name: customerName.trim(),
            contact: customerContact || '',
            address: 'Walk-in Counter',
            totalPurchased: total,
            totalPaid: advance,
            remainingBalance: balance,
          });
          await newCust.save();
          order.customerId = newCust._id.toString();
        }
      } catch (custErr) {
        console.warn('Customer auto-create/update warning:', custErr.message);
      }
    }

    // 2. Save Order
    await order.save();

    // 3. Deduct Stock for each product
    for (const item of items) {
      const pId = item.productId || item.id;
      if (pId) {
        try {
          if (pId.length === 24) {
            await Product.findByIdAndUpdate(pId, {
              $inc: { currentStock: -Number(item.qty || 1) },
            });
          } else {
            await Product.findOneAndUpdate(
              { $or: [{ _id: pId }, { name: item.name }] },
              { $inc: { currentStock: -Number(item.qty || 1) } }
            );
          }
        } catch (e) {
          console.warn('Stock deduct warning:', e.message);
        }
      }
    }

    res.status(201).json(order);
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
