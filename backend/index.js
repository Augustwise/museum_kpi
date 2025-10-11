require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const exposRoutes = require('./routes/expos');
const usersRoutes = require('./routes/users');

async function createApp() {
  const app = express();

  // No CORS needed when frontend and backend share the same origin
  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/expos', exposRoutes);
  app.use('/api/users', usersRoutes);

  // Frontend integration
  const isProd = process.env.NODE_ENV === 'production';
  const rootDir = path.resolve(__dirname, '..');
  const distPath = path.resolve(rootDir, 'dist');

  if (!isProd) {
    // Vite dev server in middleware mode for a single unified server
    const { createServer } = await import('vite');
    const vite = await createServer({
      configFile: path.resolve(rootDir, 'vite.config.mjs'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve built frontend in production
    app.use(express.static(distPath));

    // Serve existing files directly; otherwise fall back to index.html (SPA)
    app.get('*', (req, res) => {
      const candidate = path.join(distPath, req.path);
      try {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return res.sendFile(candidate);
        }
      } catch {}
      return res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'museum';

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in .env');
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI, { dbName: DB_NAME })
  .then(async () => {
    console.log(`Connected to MongoDB (db: ${DB_NAME})`);
    const app = await createApp();
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });