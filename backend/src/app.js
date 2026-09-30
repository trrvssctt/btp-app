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
    // Autoriser les requêtes sans origine (comme curl ou outils serveurs)
    if (!origin) return cb(null, true);

    const allowed = env.corsOrigins.includes('*') || env.corsOrigins.includes(origin);
    if (allowed) return cb(null, true);

    // En développement, autoriser tous les localhost
    if (env.nodeEnv === 'development' && origin.includes('localhost')) {
      console.log(`[CORS] Autorisation dev pour: ${origin}`);
      return cb(null, true);
    }

    console.error(`[CORS] Origine bloquée: ${origin}`);
    console.error(`[CORS] Origines autorisées: ${env.corsOrigins.join(', ')}`);
    const error = new Error(`CORS blocked: ${origin}`);
    error.status = 403;
    return cb(error);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // 10mb pour autoriser l'upload d'images base64
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
app.use('/api/domotique', require('./routes/domotiqueRoutes'));
app.use('/api/company-settings', require('./routes/companySettingsRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/validation-rules', require('./routes/validationRuleRoutes'));
app.use('/api/notification-settings', require('./routes/notificationSettingsRoutes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
