import { z } from 'zod';

export const createDocumentTypeSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  code: z.string().min(2).max(20).trim().toUpperCase(),
  description: z.string().max(500).trim().optional(),
  prefix: z.string().min(1).max(10).trim().toUpperCase(),
  retentionYears: z.coerce.number().int().min(1).max(100).optional(),
});

export const updateDocumentTypeSchema = createDocumentTypeSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateDocumentTypeDto = z.infer<typeof createDocumentTypeSchema>;
export type UpdateDocumentTypeDto = z.infer<typeof updateDocumentTypeSchema>;
