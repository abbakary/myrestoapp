import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { errorMiddleware } from './server/core/http.ts';
import { getOpenApiSpec, renderSwaggerDocsHtml } from './server/core/openapi.ts';
import { storeRepo } from './server/core/store.ts';
import { apiV1Router } from './server/routes/index.ts';

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);
  const isProduction = process.env.NODE_ENV === 'production';

  // Ensure initial persisted state is bootstrapped at startup
  storeRepo.getState();

  app.use(express.json({ limit: '10mb' }));

  app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) {
      next();
      return;
    }
    const start = Date.now();
    res.on('finish', () => {
      const durationMs = Date.now() - start;
      console.log(`[API] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
    });
    next();
  });

  // OpenAPI 3.0 schema & interactive Swagger UI docs
  app.get('/api/openapi.json', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.get('host') || `localhost:${port}`;
    res.json(getOpenApiSpec(`${protocol}://${host}`));
  });

  app.get('/api/docs', (_req, res) => {
    res.type('html').send(renderSwaggerDocsHtml());
  });

  // Mount versioned REST API
  app.use('/api/v1', apiV1Router);

  // Unknown API route JSON 404
  app.use('/api', (req, res) => {
    res.status(404).json({
      detail: `API route not found: ${req.method} ${req.originalUrl}`,
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  // Structured HTTP/validation error handler
  app.use(errorMiddleware);

  // Frontend Vite dev middleware or built static SPA fallback
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    } else {
      app.get('/', (_req, res) => {
        res.json({
          status: 'ok',
          message: 'RestaurantOS API server running. Run `npm run build` to serve static frontend assets.',
          docs: '/api/docs',
          openapi: '/api/openapi.json',
        });
      });
    }
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[RestaurantOS] Full-stack server running on http://0.0.0.0:${port}`);
    console.log(`[RestaurantOS] API v1 base: http://localhost:${port}/api/v1 | Docs: http://localhost:${port}/api/docs`);
  });
}

startServer().catch((err) => {
  console.error('[RestaurantOS] Failed to start server:', err);
  process.exit(1);
});
