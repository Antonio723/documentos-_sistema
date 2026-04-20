import { z } from 'zod';

export const createVersionSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000).trim(),
});

export type CreateVersionDto = z.infer<typeof createVersionSchema>;
