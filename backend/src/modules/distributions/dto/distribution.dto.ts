import { z } from 'zod';

export const createDistributionSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, 'Selecione ao menos um destinatário'),
  copyType: z.enum(['controlled', 'uncontrolled']).default('controlled'),
  dueDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export const distributionFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['pending', 'confirmed', 'all']).optional().default('all'),
  documentId: z.string().uuid().optional(),
});

export type CreateDistributionDto = z.infer<typeof createDistributionSchema>;
export type DistributionFilterDto = z.infer<typeof distributionFilterSchema>;
