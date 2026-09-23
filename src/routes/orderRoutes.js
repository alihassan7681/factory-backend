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

        const advUsedNum = Number(req.body.advanceUsed) || 0;
        const prevBalNum = Number(req.body.previousBalance) || 0;
        const totalDue = total + prevBalNum - advUsedNum;
        const excessPaid = advance > totalDue ? advance - totalDue : 0;

        if (existingCustomer) {
          // Update existing customer stats
          const currentAdvance = Number(existingCustomer.advanceBalance) || 0;
          const updatedAdvance = Math.max(0, currentAdvance - advUsedNum) + excessPaid;

          existingCustomer.totalPurchased = (Number(existingCustomer.totalPurchased) || 0) + total;
          existingCustomer.totalPaid = (Number(existingCustomer.totalPaid) || 0) + advance;
          existingCustomer.remainingBalance = balance;
          existingCustomer.advanceBalance = updatedAdvance;
          if (customerContact && !existingCustomer.contact) {
            existingCustomer.contact = customerContact;
          }
          await existingCustomer.save();
          order.customerId = existingCustomer._id.toString();
        } else {
          // Create new customer account in MongoDB
          const newCustAdvance = advance > total ? advance - total : 0;
          const newCust = new Customer({
            name: customerName.trim(),
            contact: customerContact || '',
            address: 'Walk-in Counter',
            totalPurchased: total,
            totalPaid: advance,
            remainingBalance: balance,
            advanceBalance: newCustAdvance,
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

// Helper: Recalculate customer balance from remaining orders
const recalcCustomer = async (customerId, customerName) => {
  try {
    let cust = null;
    if (customerId && customerId.length === 24) {
      cust = await Customer.findById(customerId);
    }
    if (!cust && customerName) {
      cust = await Customer.findOne({ name: { $regex: new RegExp(`^${customerName.trim()}$`, 'i') } });
    }
    if (!cust) return;

    const remainingOrders = await Order.find({
      $or: [
        { customerId: cust._id.toString() },
        { customerName: { $regex: new RegExp(`^${cust.name.trim()}$`, 'i') } },
      ],
    });

    const totalPurchased = remainingOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const totalPaidFromOrders = remainingOrders.reduce((sum, o) => sum + (Number(o.advancePaid) || 0), 0);
    const currentAdvance = Number(cust.advanceBalance) || 0;
    const rawRemaining = totalPurchased - totalPaidFromOrders;

    cust.totalPurchased = totalPurchased;
    cust.totalPaid = totalPaidFromOrders + currentAdvance;
    cust.remainingBalance = Math.max(0, rawRemaining - currentAdvance);
    await cust.save();
  } catch (e) {
    console.warn('Customer recalculation error:', e.message);
  }
};

// Helper: Restore stock for an order's items
const restoreOrderStock = async (items = []) => {
  for (const item of items) {
    const pId = item.productId || item.id;
    const qty = Number(item.qty || 1);
    if (pId) {
      try {
        if (pId.length === 24) {
          await Product.findByIdAndUpdate(pId, { $inc: { currentStock: qty } });
        } else {
          await Product.findOneAndUpdate(
            { $or: [{ _id: pId }, { name: item.name }] },
            { $inc: { currentStock: qty } }
          );
        }
      } catch (e) {
        console.warn('Stock restore warning:', e.message);
      }
    }
  }
};

// POST /api/orders/clear-today - Delete all sales created today & restore stock
router.post('/clear-today', async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayOrders = await Order.find({
      $or: [
        { createdAt: { $gte: startOfDay } },
        { orderDate: { $gte: startOfDay.toISOString() } },
      ],
    });

    if (todayOrders.length === 0) {
      return res.json({ message: 'No sales found for today', count: 0 });
    }

    const customerIdsToRecalc = new Set();

    for (const ord of todayOrders) {
      // 1. Restore product stock
      await restoreOrderStock(ord.items);
      // Track customer
      if (ord.customerId) customerIdsToRecalc.add(ord.customerId);
      if (ord.customerName) customerIdsToRecalc.add(ord.customerName);
    }

    // 2. Delete all today's orders
    await Order.deleteMany({ _id: { $in: todayOrders.map((o) => o._id) } });

    // 3. Recalculate customer balances
    for (const custIdentifier of customerIdsToRecalc) {
      await recalcCustomer(custIdentifier, custIdentifier);
    }

    res.json({
      message: `Successfully deleted ${todayOrders.length} sales from today and restored product inventory!`,
      count: todayOrders.length,
    });
  } catch (err) {
    console.error('Clear today sales error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/:id - Delete a single sale & restore stock
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let order = null;

    if (id && id.length === 24) {
      order = await Order.findById(id);
    }
    if (!order) {
      order = await Order.findOne({ $or: [{ invoiceNo: id }, { _id: id }] });
    }

    if (!order) {
      return res.status(404).json({ message: 'Order / Invoice not found' });
    }

    // 1. Restore product stock
    await restoreOrderStock(order.items);

    // 2. Delete the order
    await Order.findByIdAndDelete(order._id);

    // 3. Recalculate customer balance
    await recalcCustomer(order.customerId, order.customerName);

    res.json({
      message: `Invoice #${order.invoiceNo || order.id} deleted successfully and inventory restored!`,
      orderId: order._id,
    });
  } catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
