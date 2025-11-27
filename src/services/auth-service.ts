import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { env } from '../config/env.js';
import { sql } from '../db/client.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { AuthenticatedUser, UserRole } from '../types/index.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.union([z.literal('user'), z.literal('admin'), z.literal('navigator')]).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  password_hash?: string;
}

export async function registerUser(rawInput: RegisterInput) {
  const input = registerSchema.parse(rawInput);

  const existing = await sql<UserRecord[]>`
    SELECT id FROM users WHERE email = ${input.email}
  `;

  if (existing.length > 0) {
    throw createHttpError(409, 'Email already registered');
  }

  const passwordHash = await hashPassword(input.password);
  const role = input.role ?? 'user';
  const id = randomUUID();

  const [user] = await sql<UserRecord[]>`
    INSERT INTO users (id, email, full_name, role, password_hash)
    VALUES (${id}, ${input.email}, ${input.fullName}, ${role}, ${passwordHash})
    RETURNING id, email, full_name, role
  `;

  const token = signToken(user);
  return { token, user: mapUser(user) };
}

export async function loginUser(rawInput: LoginInput) {
  const input = loginSchema.parse(rawInput);

  const [user] = await sql<UserRecord[]>`
    SELECT id, email, full_name, role, password_hash
    FROM users WHERE email = ${input.email}
  `;

  if (!user || !user.password_hash) {
    throw createHttpError(401, 'Invalid credentials');
  }

  const valid = await verifyPassword(input.password, user.password_hash);
  if (!valid) {
    throw createHttpError(401, 'Invalid credentials');
  }

  const token = signToken(user);
  return { token, user: mapUser(user) };
}

export async function getUserProfile(userId: string) {
  const [user] = await sql<UserRecord[]>`
    SELECT id, email, full_name, role FROM users WHERE id = ${userId}
  `;

  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  return mapUser(user);
}

function signToken(user: UserRecord) {
  const payload: AuthenticatedUser = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '7d'
  });
}

function mapUser(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role
  };
}

