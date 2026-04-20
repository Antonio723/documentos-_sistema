import { Badge } from '@/components/ui/badge';
import type { DocumentStatus } from '@/types';

const STATUS_CONFIG: Record<DocumentStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive' | 'muted' | 'outline' }> = {
  draft:     { label: 'Rascunho',  variant: 'muted' },
  review:    { label: 'Em Revisão', variant: 'info' },
  approval:  { label: 'Aprovação', variant: 'warning' },
  published: { label: 'Publicado', variant: 'success' },
  obsolete:  { label: 'Obsoleto',  variant: 'secondary' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const cfg = STATUS_CONFIG[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
