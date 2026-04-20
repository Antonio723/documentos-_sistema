import { z } from 'zod';

export const createTrainingSchema = z.object({
  title:         z.string().min(1).max(200),
  description:   z.string().max(1000).optional(),
  documentId:    z.string().uuid().optional(),
  category:      z.string().max(100).optional(),
  durationHours: z.coerce.number().positive().optional(),
  validityMonths:z.coerce.number().int().positive().optional(),
  passingScore:  z.coerce.number().int().min(0).max(100).optional(),
  status:        z.enum(['draft', 'active', 'archived']).default('draft'),
});

export const updateTrainingSchema = createTrainingSchema.partial();

export const assignUsersSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1),
  dueDate: z.string().datetime().optional(),
  notes:   z.string().max(500).optional(),
});

export const recordCompletionSchema = z.object({
  score:  z.coerce.number().int().min(0).max(100).optional(),
  passed: z.boolean().default(true),
  notes:  z.string().max(1000).optional(),
});

export const trainingsFilterSchema = z.object({
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().positive().max(100).default(20),
  status:   z.enum(['draft', 'active', 'archived']).optional(),
  category: z.string().optional(),
  search:   z.string().optional(),
});

export const myAssignmentsFilterSchema = z.object({
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['pending', 'in_progress', 'completed', 'overdue', 'cancelled']).optional(),
});

export type CreateTrainingDto    = z.infer<typeof createTrainingSchema>;
export type UpdateTrainingDto    = z.infer<typeof updateTrainingSchema>;
export type AssignUsersDto       = z.infer<typeof assignUsersSchema>;
export type RecordCompletionDto  = z.infer<typeof recordCompletionSchema>;
export type TrainingsFilterDto   = z.infer<typeof trainingsFilterSchema>;
export type MyAssignmentsFilterDto = z.infer<typeof myAssignmentsFilterSchema>;
