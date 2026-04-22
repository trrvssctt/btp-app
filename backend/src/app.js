const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curl, server-to-server
    if (env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// Health
app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/sites', require('./routes/siteRoutes'));
app.use('/api/phases', require('./routes/phaseRoutes'));
app.use('/api/budget-lots', require('./routes/budgetLotRoutes'));
app.use('/api/article-families', require('./routes/articleFamilyRoutes'));
app.use('/api/units', require('./routes/unitRoutes'));
app.use('/api/articles', require('./routes/articleRoutes'));
app.use('/api/depots', require('./routes/depotRoutes'));
app.use('/api/stock', require('./routes/stockRoutes'));
app.use('/api/stock-movements', require('./routes/stockMovementRoutes'));
app.use('/api/transfers', require('./routes/transferRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/requests', require('./routes/requestRoutes'));
app.use('/api/purchase-orders', require('./routes/purchaseOrderRoutes'));
app.use('/api/receipts', require('./routes/receiptRoutes'));
app.use('/api/roles', require('./routes/roleRoutes'));
app.use('/api/equipements', require('./routes/equipementRoutes'));
app.use('/api/reporting', require('./routes/reportingRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/audit', require('./routes/auditRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
