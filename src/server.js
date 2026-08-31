require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Initialize App
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Connect Database
connectDB();

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'Factory OS API Server',
    timestamp: new Date(),
  });
});

// Modular Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/production', require('./routes/productionRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/payroll', require('./routes/payrollRoutes'));
app.use('/api/capital', require('./routes/capitalRoutes'));
app.use('/api/roznamcha', require('./routes/roznamchaRoutes'));
app.use('/api/qarz', require('./routes/qarzRoutes'));
app.use('/api/maintenance', require('./routes/maintenanceRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/purchase-orders', require('./routes/purchaseOrderRoutes'));
app.use('/api/settings', require('./routes/settingRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));

const path = require('path');
const fs = require('fs');

// Serve Static Frontend Files in Production Deployment
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

// 404 Handler for API Routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: `API Route ${req.originalUrl} not found` });
});

// SPA Catch-all Handler (Serves index.html for Frontend React Router)
app.use((req, res, next) => {
  const indexHtml = path.join(frontendDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Factory ERP Backend running on http://localhost:${PORT}`);
});
