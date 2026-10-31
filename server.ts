import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createApiApp, ensureBackendInitialized } from './src/server/app.ts';

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  const app = createApiApp();

  await ensureBackendInitialized();

  // Frontend Vite Middleware (Development) or Static SPA Serving (Cloud Run Production)
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rooprani server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Rooprani server:', err);
  process.exit(1);
});
