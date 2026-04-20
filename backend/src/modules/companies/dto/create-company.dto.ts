import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().min(2).max(255).trim(),
  cnpj: z
    .string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ must be formatted as XX.XXX.XXX/XXXX-XX')
    .optional(),
  email: z.string().email().toLowerCase().trim().optional(),
  phone: z.string().max(20).trim().optional(),
  plan: z.enum(['basic', 'professional', 'enterprise']).default('basic'),
});

export const updateCompanySchema = createCompanySchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateCompanyDto = z.infer<typeof createCompanySchema>;
export type UpdateCompanyDto = z.infer<typeof updateCompanySchema>;
