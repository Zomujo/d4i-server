export type UserRole = 'user' | 'admin' | 'navigator';

export type ComplaintStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected' | 'escalated';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

