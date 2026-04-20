import { z } from 'zod';

export const workflowStepSchema = z.object({
  order: z.coerce.number().int().min(1),
  name: z.string().min(2).max(100).trim(),
  description: z.string().max(500).trim().optional(),
  approverUserId: z.string().uuid().optional(),
  approverRoleId: z.string().uuid().optional(),
  slaHours: z.coerce.number().int().min(1).max(720).optional(),
  isRequired: z.boolean().default(true),
}).refine(
  (d) => d.approverUserId || d.approverRoleId,
  { message: 'Each step must have an approverUserId or approverRoleId', path: ['approverUserId'] },
);

export const createWorkflowSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  description: z.string().max(500).trim().optional(),
  documentTypeId: z.string().uuid().optional(),
  steps: z.array(workflowStepSchema).min(1, 'At least one step is required'),
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(500).trim().optional(),
  documentTypeId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  steps: z.array(workflowStepSchema).min(1).optional(),
});

export type CreateWorkflowDto = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowDto = z.infer<typeof updateWorkflowSchema>;
