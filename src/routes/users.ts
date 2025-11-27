import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { listAdmins, listNavigators } from '../services/user-service';

export function usersRouter() {
  const router = Router();

  router.use(authenticate);

  router.get('/users/navigators', authorize(['admin']), async (req, res) => {
    const navigators = await listNavigators();
    res.json({ navigators });
  });

  router.get('/users/admins', authorize(['admin']), async (req, res) => {
    const admins = await listAdmins();
    res.json({ admins });
  });

  return router;
}

