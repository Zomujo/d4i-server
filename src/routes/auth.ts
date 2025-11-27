import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { getUserProfile, loginUser, registerUser } from '../services/auth-service';

export function authRouter() {
  const router = Router();

  router.post('/auth/register', async (req, res) => {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  });

  router.post('/auth/login', async (req, res) => {
    const result = await loginUser(req.body);
    res.json(result);
  });

  router.get('/auth/me', authenticate, async (req, res) => {
    const user = await getUserProfile(req.user!.id);
    res.json({ user });
  });

  return router;
}

