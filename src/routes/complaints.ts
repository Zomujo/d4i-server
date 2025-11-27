import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  assignComplaint,
  escalateComplaint,
  getComplaintStats,
  getNavigatorUpdates,
  getOverdueComplaints,
  listComplaints,
  submitComplaint,
  updateComplaintStatus
} from '../services/complaint-service.js';
import { ComplaintStatus } from '../types/index.js';

export function complaintsRouter() {
  const router = Router();

  router.use(authenticate);

  router.post('/complaints', async (req, res) => {
    const complaint = await submitComplaint(req.user!.id, req.body);
    res.status(201).json({ complaint });
  });

  router.get('/complaints', async (req, res) => {
    const statusParam = Array.isArray(req.query.status)
      ? req.query.status[0]
      : req.query.status;
    const status = isComplaintStatus(statusParam) ? statusParam : undefined;
    const complaints = await listComplaints(req.user!.id, req.user!.role, status);
    res.json({ complaints });
  });

  router.patch(
    '/complaints/:id/status',
    authorize(['admin', 'navigator']),
    async (req, res) => {
      const complaint = await updateComplaintStatus(
        req.params.id,
        req.body,
        req.user!.id,
        req.user!.role
      );
      res.json({ complaint });
    }
  );

  router.patch(
    '/complaints/:id/assign',
    authorize(['admin']),
    async (req, res) => {
      const complaint = await assignComplaint(req.params.id, req.body);
      res.json({ complaint });
    }
  );

  router.get('/complaints/stats', authorize(['admin']), async (req, res) => {
    const stats = await getComplaintStats();
    res.json({ stats });
  });

  router.get('/complaints/navigator-updates', authorize(['admin']), async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const updates = await getNavigatorUpdates(limit);
    res.json({ updates });
  });

  router.get('/complaints/overdue', authorize(['admin']), async (req, res) => {
    const complaints = await getOverdueComplaints();
    res.json({ complaints });
  });

  router.patch(
    '/complaints/:id/escalate',
    authorize(['admin']),
    async (req, res) => {
      const complaint = await escalateComplaint(
        req.params.id,
        req.body,
        req.user!.id
      );
      res.json({ complaint });
    }
  );

  return router;
}

function isComplaintStatus(value: unknown): value is ComplaintStatus {
  return (
    value === 'pending' ||
    value === 'in_progress' ||
    value === 'resolved' ||
    value === 'rejected' ||
    value === 'escalated'
  );
}


