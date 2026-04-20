import { z } from 'zod';

export const documentStatusValues = ['draft', 'review', 'approval', 'published', 'obsolete', 'cancelled'] as const;
export const confidentialityValues = ['public_internal', 'restricted', 'confidential', 'critical'] as const;

const documentBaseSchema = z.object({
  title: z.string().min(3).max(500).trim(),
  description: z.string().max(2000).trim().optional(),
  documentTypeId: z.string().uuid(),
  area: z.string().max(100).trim().optional(),
  process: z.string().max(100).trim().optional(),
  product: z.string().max(100).trim().optional(),
  confidentiality: z.enum(confidentialityValues).default('public_internal'),
  validityStart: z.coerce.date().optional(),
  validityEnd: z.coerce.date().optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
});

const validityRefine = (data: { validityStart?: Date; validityEnd?: Date }) =>
  !data.validityStart || !data.validityEnd || data.validityEnd > data.validityStart;

export const createDocumentSchema = documentBaseSchema.refine(validityRefine, {
  message: 'validityEnd must be after validityStart',
  path: ['validityEnd'],
});

export const updateDocumentSchema = documentBaseSchema.partial().refine(validityRefine, {
  message: 'validityEnd must be after validityStart',
  path: ['validityEnd'],
});

export const changeStatusSchema = z.object({
  status: z.enum(documentStatusValues),
  comment: z.string().max(1000).optional(),
});

export const documentFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(documentStatusValues).optional(),
  documentTypeId: z.string().uuid().optional(),
  area: z.string().optional(),
  confidentiality: z.enum(confidentialityValues).optional(),
  ownerId: z.string().uuid().optional(),
  expiringDays: z.coerce.number().int().min(1).optional(),
  sortBy: z.enum(['title', 'code', 'createdAt', 'updatedAt', 'validityEnd']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateDocumentDto = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentDto = z.infer<typeof updateDocumentSchema>;
export type ChangeStatusDto = z.infer<typeof changeStatusSchema>;
export type DocumentFiltersDto = z.infer<typeof documentFiltersSchema>;
