import createHttpError from 'http-errors';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { sql } from '../db/client';
import { ComplaintStatus, UserRole } from '../types';

const baseComplaintSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.string().optional()
});

const statusEnum = ['pending', 'in_progress', 'resolved', 'rejected', 'escalated'] as const;

const updateStatusSchema = z.object({
  status: z.enum(statusEnum)
});

const assignComplaintSchema = z.object({
  navigatorId: z.string().uuid(),
  expectedResolutionDate: z.string().datetime().optional()
});

const escalateComplaintSchema = z.object({
  targetAdminId: z.string().uuid(),
  reason: z.string().min(5)
});

export type CreateComplaintInput = z.infer<typeof baseComplaintSchema>;
export type UpdateComplaintStatusInput = z.infer<typeof updateStatusSchema>;
export type AssignComplaintInput = z.infer<typeof assignComplaintSchema>;
export type EscalateComplaintInput = z.infer<typeof escalateComplaintSchema>;

interface ComplaintRecord {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string | null;
  status: ComplaintStatus;
  assigned_navigator_id: string | null;
  expected_resolution_date: Date | null;
  responded_at: Date | null;
  escalated_at: Date | null;
  escalation_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function submitComplaint(
  userId: string,
  rawInput: CreateComplaintInput
) {
  const input = baseComplaintSchema.parse(rawInput);
  const id = randomUUID();

  const [complaint] = await sql<ComplaintRecord[]>`
    INSERT INTO complaints (id, user_id, title, description, category)
    VALUES (${id}, ${userId}, ${input.title}, ${input.description}, ${input.category ?? null})
    RETURNING *
  `;

  return mapComplaint(complaint);
}

export async function listComplaints(
  userId: string,
  role: UserRole,
  status?: ComplaintStatus
) {
  if (role === 'admin') {
    const complaints = await sql<ComplaintRecord[]>`
      SELECT * FROM complaints
      ${status ? sql`WHERE status = ${status}` : sql``}
      ORDER BY created_at DESC
    `;
    return complaints.map(mapComplaint);
  }

  if (role === 'navigator') {
    const complaints = await sql<ComplaintRecord[]>`
      SELECT * FROM complaints
      WHERE assigned_navigator_id = ${userId}
      ${status ? sql`AND status = ${status}` : sql``}
      ORDER BY created_at DESC
    `;
    return complaints.map(mapComplaint);
  }

  // Regular users see only their own complaints
  const complaints = await sql<ComplaintRecord[]>`
    SELECT * FROM complaints
    WHERE user_id = ${userId}
    ${status ? sql`AND status = ${status}` : sql``}
    ORDER BY created_at DESC
  `;
  return complaints.map(mapComplaint);
}

export async function updateComplaintStatus(
  complaintId: string,
  rawInput: UpdateComplaintStatusInput,
  userId?: string,
  role?: string
) {
  const input = updateStatusSchema.parse(rawInput);

  // Track when status changes to in_progress (response time)
  const [existing] = await sql<ComplaintRecord[]>`
    SELECT status, assigned_navigator_id FROM complaints WHERE id = ${complaintId}
  `;

  if (!existing) {
    throw createHttpError(404, 'Complaint not found');
  }

  // Navigators can only update complaints assigned to them
  if (role === 'navigator' && existing.assigned_navigator_id !== userId) {
    throw createHttpError(403, 'You can only update complaints assigned to you');
  }

  const shouldSetRespondedAt =
    existing.status === 'pending' && input.status === 'in_progress';

  // Record status change in history if status actually changed
  if (existing.status !== input.status && userId) {
    await sql`
      INSERT INTO status_history (complaint_id, old_status, new_status, updated_by)
      VALUES (${complaintId}, ${existing.status}, ${input.status}, ${userId})
    `;
  }

  const [complaint] = await sql<ComplaintRecord[]>`
    UPDATE complaints
    SET 
      status = ${input.status},
      ${shouldSetRespondedAt ? sql`responded_at = NOW(),` : sql``}
      updated_at = NOW()
    WHERE id = ${complaintId}
    RETURNING *
  `;

  if (!complaint) {
    throw createHttpError(404, 'Complaint not found');
  }

  return mapComplaint(complaint);
}

export async function assignComplaint(
  complaintId: string,
  rawInput: AssignComplaintInput
) {
  const input = assignComplaintSchema.parse(rawInput);

  const expectedDate = input.expectedResolutionDate
    ? new Date(input.expectedResolutionDate)
    : null;

  const [complaint] = await sql<ComplaintRecord[]>`
    UPDATE complaints
    SET 
      assigned_navigator_id = ${input.navigatorId},
      expected_resolution_date = ${expectedDate},
      updated_at = NOW()
    WHERE id = ${complaintId}
    RETURNING *
  `;

  if (!complaint) {
    throw createHttpError(404, 'Complaint not found');
  }

  return mapComplaint(complaint);
}

export async function escalateComplaint(
  complaintId: string,
  rawInput: EscalateComplaintInput,
  escalatedBy: string
) {
  const input = escalateComplaintSchema.parse(rawInput);

  // Verify target admin exists and is an admin
  const [targetAdmin] = await sql<{ id: string; role: string }[]>`
    SELECT id, role FROM users WHERE id = ${input.targetAdminId}
  `;

  if (!targetAdmin || targetAdmin.role !== 'admin') {
    throw createHttpError(400, 'Target user must be an admin');
  }

  // Get existing complaint to track status change
  const [existing] = await sql<ComplaintRecord[]>`
    SELECT status FROM complaints WHERE id = ${complaintId}
  `;

  if (!existing) {
    throw createHttpError(404, 'Complaint not found');
  }

  // Record status change in history
  if (existing.status !== 'escalated' && escalatedBy) {
    await sql`
      INSERT INTO status_history (complaint_id, old_status, new_status, updated_by)
      VALUES (${complaintId}, ${existing.status}, 'escalated', ${escalatedBy})
    `;
  }

  const [complaint] = await sql<ComplaintRecord[]>`
    UPDATE complaints
    SET 
      status = 'escalated',
      assigned_navigator_id = ${input.targetAdminId},
      escalated_at = NOW(),
      escalation_reason = ${input.reason},
      updated_at = NOW()
    WHERE id = ${complaintId}
    RETURNING *
  `;

  if (!complaint) {
    throw createHttpError(404, 'Complaint not found');
  }

  return mapComplaint(complaint);
}

export async function getComplaintStats() {
  const [stats] = await sql<{
    active_cases: number;
    avg_response_hours: number | null;
    resolution_rate: number;
    overdue_cases: number;
  }[]>`
    WITH stats AS (
      SELECT 
        COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress'))::int AS active_cases,
        AVG(EXTRACT(EPOCH FROM (responded_at - created_at)) / 3600) AS avg_response_hours,
        COUNT(*) FILTER (WHERE status = 'resolved')::float / NULLIF(COUNT(*), 0) * 100 AS resolution_rate,
        COUNT(*) FILTER (
          WHERE expected_resolution_date IS NOT NULL 
          AND expected_resolution_date < NOW() 
          AND status != 'resolved'
        )::int AS overdue_cases
      FROM complaints
    )
    SELECT * FROM stats
  `;

  return {
    activeCases: stats.active_cases,
    avgResponseHours: stats.avg_response_hours ? Math.round(stats.avg_response_hours * 10) / 10 : 0,
    resolutionRate: stats.resolution_rate ? Math.round(stats.resolution_rate * 10) / 10 : 0,
    overdueCases: stats.overdue_cases
  };
}

interface StatusHistoryRecord {
  id: string;
  complaint_id: string;
  old_status: string;
  new_status: string;
  updated_by: string;
  updated_at: Date;
  navigator_name: string;
  navigator_email: string;
  complaint_title: string;
}

export async function getNavigatorUpdates(limit: number = 10) {
  const updates = await sql<StatusHistoryRecord[]>`
    SELECT 
      sh.id,
      sh.complaint_id,
      sh.old_status,
      sh.new_status,
      sh.updated_by,
      sh.updated_at,
      u.full_name AS navigator_name,
      u.email AS navigator_email,
      c.title AS complaint_title
    FROM status_history sh
    INNER JOIN users u ON sh.updated_by = u.id
    INNER JOIN complaints c ON sh.complaint_id = c.id
    WHERE u.role = 'navigator'
    ORDER BY sh.updated_at DESC
    LIMIT ${limit}
  `;

  return updates.map((update) => ({
    id: update.id,
    complaintId: update.complaint_id,
    complaintTitle: update.complaint_title,
    navigatorName: update.navigator_name,
    navigatorEmail: update.navigator_email,
    oldStatus: update.old_status,
    newStatus: update.new_status,
    updatedAt: update.updated_at
  }));
}

export async function getOverdueComplaints() {
  const complaints = await sql<ComplaintRecord[]>`
    SELECT c.*
    FROM complaints c
    WHERE c.expected_resolution_date IS NOT NULL
      AND c.expected_resolution_date < NOW()
      AND c.status != 'resolved'
    ORDER BY c.expected_resolution_date ASC
    LIMIT 20
  `;

  return complaints.map(mapComplaint);
}

function mapComplaint(record: ComplaintRecord) {
  return {
    id: record.id,
    userId: record.user_id,
    title: record.title,
    description: record.description,
    category: record.category,
    status: record.status,
    assignedNavigatorId: record.assigned_navigator_id,
    expectedResolutionDate: record.expected_resolution_date,
    respondedAt: record.responded_at,
    escalatedAt: record.escalated_at,
    escalationReason: record.escalation_reason,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

