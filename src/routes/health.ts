import { Router } from 'express';

export function healthRouter() {
  const router = Router();

  router.get('/healthz', (_req, res) => {
    res.json({
      status: 'ok'
    });
  });

  return router;
}

