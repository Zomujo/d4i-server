import createHttpError from 'http-errors';
import { sql } from '../db/client.js';

interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export async function listNavigators() {
  const navigators = await sql<UserRecord[]>`
    SELECT id, email, full_name, role
    FROM users
    WHERE role = 'navigator'
    ORDER BY full_name ASC
  `;

  return navigators.map((user) => ({
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role
  }));
}

export async function listAdmins() {
  const admins = await sql<UserRecord[]>`
    SELECT id, email, full_name, role
    FROM users
    WHERE role = 'admin'
    ORDER BY full_name ASC
  `;

  return admins.map((user) => ({
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role
  }));
}

