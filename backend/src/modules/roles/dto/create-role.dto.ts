import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(2).max(100).trim().toUpperCase(),
  description: z.string().max(500).trim().optional(),
  permissionIds: z.array(z.string().uuid()).default([]),
});

export const updateRoleSchema = createRoleSchema.partial();

export type CreateRoleDto = z.infer<typeof createRoleSchema>;
export type UpdateRoleDto = z.infer<typeof updateRoleSchema>;
