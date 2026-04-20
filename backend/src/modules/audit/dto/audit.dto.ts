import { z } from 'zod';

export const auditFilterSchema = z.object({
  page:       z.coerce.number().int().positive().default(1),
  limit:      z.coerce.number().int().positive().max(100).default(30),
  resource:   z.string().optional(),
  action:     z.string().optional(),
  userId:     z.string().uuid().optional(),
  resourceId: z.string().optional(),
  dateFrom:   z.string().datetime().optional(),
  dateTo:     z.string().datetime().optional(),
  search:     z.string().optional(),
});

export type AuditFilterDto = z.infer<typeof auditFilterSchema>;
