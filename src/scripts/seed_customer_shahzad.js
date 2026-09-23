require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Order = require('../models/Order');

async function seedShahzad() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in .env');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.');

    const customerName = 'شہزاد صاحب';
    const address = 'سمندری روڈ D-Type 68';

    // Check if customer already exists
    let customer = await Customer.findOne({
      name: { $regex: new RegExp(`^${customerName.trim()}$`, 'i') },
    });

    if (!customer) {
      customer = new Customer({
        name: customerName,
        contact: '',
        address: address,
        totalPurchased: 563360,
        totalPaid: 150000,
        remainingBalance: 413360,
        advanceBalance: 0,
        ability: 500000,
      });
      await customer.save();
      console.log('Created customer:', customer.name, 'ID:', customer._id);
    } else {
      customer.address = address;
      customer.totalPurchased = 563360;
      customer.totalPaid = 150000;
      customer.remainingBalance = 413360;
      customer.advanceBalance = 0;
      if (!customer.ability) customer.ability = 500000;
      await customer.save();
      console.log('Updated existing customer:', customer.name, 'ID:', customer._id);
    }

    // Clean up any old orders for this customer to prevent duplicates if re-run
    await Order.deleteMany({
      $or: [
        { customerId: customer._id.toString() },
        { customerName: { $regex: new RegExp(`^${customerName.trim()}$`, 'i') } },
      ],
    });
    console.log('Cleared previous sample orders for customer to ensure fresh ledger entries.');

    // Invoices according to ledger image:
    // 1. Previous Balance (18-08-2024 / 2026) - Rs. 390,120 with payments 50,000 + 100,000 applied
    const order1 = new Order({
      invoiceNo: 'KHATA-PG-3',
      customerId: customer._id.toString(),
      customerName: customer.name,
      customerContact: '',
      items: [
        {
          name: 'بنام رقم سابقہ کھاتہ صفحہ نمبر 3 (Previous Balance)',
          unit: 'Entry',
          qty: 1,
          price: 390120,
          subtotal: 390120,
        },
      ],
      totalAmount: 390120,
      advancePaid: 150000,
      remainingBalance: 240120,
      status: 'Partial',
      paymentHistory: [
        {
          amount: 50000,
          date: '2024-08-23T00:00:00.000Z',
          note: 'وصولی بذریعہ احتشام بھائی (صفحہ 17)',
        },
        {
          amount: 100000,
          date: '2024-09-13T00:00:00.000Z',
          note: 'وصولی بذریعہ (احتشام) (صفحہ 34)',
        },
      ],
      orderDate: '2024-08-18T00:00:00.000Z',
    });
    await order1.save();

    // 2. Mayo Carton Bill #1037 (25-08-2024) - Rs. 40,000
    const order2 = new Order({
      invoiceNo: 'INV-1037',
      customerId: customer._id.toString(),
      customerName: customer.name,
      customerContact: '',
      items: [
        {
          name: '50 کارٹن مایو (50 Cartons Mayo)',
          unit: 'Ctn',
          qty: 50,
          price: 800,
          subtotal: 40000,
        },
      ],
      totalAmount: 40000,
      advancePaid: 0,
      remainingBalance: 40000,
      status: 'Pending',
      paymentHistory: [],
      orderDate: '2024-08-25T00:00:00.000Z',
    });
    await order2.save();

    // 3. Balti Chilli Bill #1044 (01-09-2024) - Rs. 54,000
    const order3 = new Order({
      invoiceNo: 'INV-1044',
      customerId: customer._id.toString(),
      customerName: customer.name,
      customerContact: '',
      items: [
        {
          name: '30 عدد بالٹی چلی (30 Pcs Balti Chilli)',
          unit: 'Balti',
          qty: 30,
          price: 1800,
          subtotal: 54000,
        },
      ],
      totalAmount: 54000,
      advancePaid: 0,
      remainingBalance: 54000,
      status: 'Pending',
      paymentHistory: [],
      orderDate: '2024-09-01T00:00:00.000Z',
    });
    await order3.save();

    // 4. Mix Carton Bill #1073 (14-09-2024) - Rs. 79,240
    const order4 = new Order({
      invoiceNo: 'INV-1073',
      customerId: customer._id.toString(),
      customerName: customer.name,
      customerContact: '',
      items: [
        {
          name: '65 کارٹن مکس (65 Cartons Mix)',
          unit: 'Ctn',
          qty: 65,
          price: 1219.0769,
          subtotal: 79240,
        },
      ],
      totalAmount: 79240,
      advancePaid: 0,
      remainingBalance: 79240,
      status: 'Pending',
      paymentHistory: [],
      orderDate: '2024-09-14T00:00:00.000Z',
    });
    await order4.save();

    console.log('Successfully saved customer and all 4 ledger orders/invoices!');
    console.log('Customer Summary:');
    console.log('- Total Purchased: Rs.', customer.totalPurchased);
    console.log('- Total Paid: Rs.', customer.totalPaid);
    console.log('- Outstanding Balance: Rs.', customer.remainingBalance);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding customer data:', error);
    process.exit(1);
  }
}

seedShahzad();
