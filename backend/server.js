const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { router: apiRouter } = require('./routes/complaints');

const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount PRD Section 8 API routes under /api
app.use('/api', apiRouter);

// 404 handler for unknown API routes
app.use((req, res) => {
  res.status(404).json({
    message: 'Endpoint not found',
    errors: {
      path: `Cannot ${req.method} ${req.originalUrl}`
    }
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`SATI Backend running on port ${PORT}`);
  });
}

module.exports = app;
