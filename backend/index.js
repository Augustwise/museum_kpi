require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');

const { pool, connectionInfo } = require('./db');

const authRoutes = require('./routes/auth');
const expoRoutes = require('./routes/expos');
const userRoutes = require('./routes/users');

/**
 * Creates and configures a brand new Express application instance.
 * Everything related to middleware and routing lives in this function so it is
 * easy to see the order in which features are enabled.
 */
async function createApp() {
  const app = express();

  // Parse JSON bodies. Without this, req.body would be undefined for JSON requests.
  app.use(express.json());

  // A tiny health check endpoint that front-ends or monitoring tools can call.
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Attach the API routers.
  app.use('/api/auth', authRoutes);
  app.use('/api/expos', expoRoutes);
  app.use('/api/users', userRoutes);

  await attachFrontend(app);

  return app;
}

/**
 * Serves the front-end application. In development we hand off to Vite so that
 * hot reloading keeps working, while in production we simply serve the built
 * files from the dist/ directory.
 */
async function attachFrontend(app) {
  const projectRoot = path.resolve(__dirname, '..');
  const distDir = path.join(projectRoot, 'dist');
  const runningInProduction = process.env.NODE_ENV === 'production';

  if (!runningInProduction) {
    // Lazy import keeps Vite out of production bundles.
    const { createServer } = await import('vite');
    const vite = await createServer({
      configFile: path.join(projectRoot, 'vite.config.mjs'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    return;
  }

  // Serve static files that were produced by `npm run build`.
  app.use(express.static(distDir));

  // Any other route should respond with index.html so the SPA router works.
  app.get('*', (req, res) => {
    const requestedPath = path.join(distDir, req.path);

    try {
      if (fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()) {
        return res.sendFile(requestedPath);
      }
    } catch (error) {
      console.warn('Failed to check requested file:', error);
    }

    return res.sendFile(path.join(distDir, 'index.html'));
  });
}

async function startServer() {
  try {
    await pool.query('SELECT 1');
    const info = connectionInfo();
    console.log(
      `Connected to MySQL ${info.host}:${info.port}/${info.database} (ssl-mode=${info.sslMode})`
    );

    const app = await createApp();
    const port = Number(process.env.PORT) || 3000;

    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start the server:', error);
    process.exit(1);
  }
}

startServer();
