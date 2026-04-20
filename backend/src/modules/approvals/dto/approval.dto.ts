import { z } from 'zod';

export const createApprovalSchema = z.object({
  workflowTemplateId: z.string().uuid(),
});

export const approvalActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'request_changes']),
  comment: z.string().max(2000).trim().optional(),
}).refine(
  (d) => d.action === 'approve' || (d.comment && d.comment.length >= 5),
  { message: 'Comment is required (min 5 chars) when rejecting or requesting changes', path: ['comment'] },
);

export const approvalsFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['in_progress', 'approved', 'rejected', 'cancelled']).optional(),
  documentId: z.string().uuid().optional(),
  myPending: z.coerce.boolean().optional(),
});

export type CreateApprovalDto = z.infer<typeof createApprovalSchema>;
export type ApprovalActionDto = z.infer<typeof approvalActionSchema>;
export type ApprovalsFilterDto = z.infer<typeof approvalsFilterSchema>;
