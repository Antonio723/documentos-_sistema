import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
  companyId: z.string().uuid().optional(),
});

export type LoginDto = z.infer<typeof loginSchema>;
