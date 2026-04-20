import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, GraduationCap, Users, Clock, Search, FileText } from 'lucide-react';
import { trainingsService } from '@/services/trainings.service';
import { documentsService } from '@/services/documents.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { Training, TrainingStatus } from '@/types';

const STATUS_CFG: Record<TrainingStatus, { label: string; variant: 'success' | 'warning' | 'muted' }> = {
  draft:    { label: 'Rascunho', variant: 'muted' },
  active:   { label: 'Ativo',    variant: 'success' },
  archived: { label: 'Arquivado', variant: 'warning' },
};

const formSchema = z.object({
  title:          z.string().min(1, 'Título obrigatório'),
  description:    z.string().optional(),
  category:       z.string().optional(),
  documentId:     z.string().optional(),
  durationHours:  z.coerce.number().positive().optional(),
  validityMonths: z.coerce.number().int().positive().optional(),
  passingScore:   z.coerce.number().int().min(0).max(100).optional(),
  status:         z.enum(['draft', 'active', 'archived']).default('draft'),
});

type FormValues = z.infer<typeof formSchema>;

interface TrainingFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Training;
  onSaved: () => void;
}

function TrainingFormDialog({ open, onOpenChange, editing, onSaved }: TrainingFormDialogProps) {
  const [docSearch, setDocSearch] = useState('');

  const { data: docsData } = useQuery({
    queryKey: ['docs-for-training', docSearch],
    queryFn: () => documentsService.findAll({ status: 'published', limit: 20, ...(docSearch ? { search: docSearch } : {}) }),
    enabled: open,
  });
  const publishedDocs = docsData?.data ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: editing
      ? {
          title: editing.title, description: editing.description ?? '',
          category: editing.category ?? '', status: editing.status,
          documentId: editing.documentId ?? undefined,
          durationHours: editing.durationHours ?? undefined,
          validityMonths: editing.validityMonths ?? undefined,
          passingScore: editing.passingScore ?? undefined,
        }
      : { status: 'draft' },
  });

  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      editing
        ? trainingsService.update(editing.id, v)
        : trainingsService.create({ ...v, status: v.status }),
    onSuccess: () => {
      toast.success(editing ? 'Treinamento atualizado' : 'Treinamento criado');
      onSaved();
      onOpenChange(false);
      form.reset();
    },
    onError: () => toast.error('Erro ao salvar treinamento'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Treinamento' : 'Novo Treinamento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(v => mutation.mutate(v))} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input {...form.register('title')} placeholder="Ex: NR-35 Trabalho em Altura" />
            {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea {...form.register('description')} rows={2} placeholder="Objetivo e conteúdo do treinamento..." />
          </div>
          <div className="space-y-1.5">
            <Label>Documento vinculado</Label>
            <Controller control={form.control} name="documentId" render={({ field }) => {
              const selected = publishedDocs.find(d => d.id === field.value)
                ?? (editing?.document ? { id: editing.document.id, code: editing.document.code, title: editing.document.title } : null);
              return (
                <div className="space-y-1.5">
                  {selected && (
                    <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{selected.code} — {selected.title}</span>
                      <button type="button" onClick={() => { field.onChange(undefined); setDocSearch(''); }}
                        className="text-muted-foreground hover:text-foreground text-xs">✕</button>
                    </div>
                  )}
                  {!selected && (
                    <>
                      <Input placeholder="Buscar documento publicado..." value={docSearch}
                        onChange={e => setDocSearch(e.target.value)} />
                      {docSearch && publishedDocs.length > 0 && (
                        <div className="border rounded-md divide-y max-h-36 overflow-y-auto">
                          {publishedDocs.slice(0, 6).map(d => (
                            <button key={d.id} type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                              onClick={() => { field.onChange(d.id); setDocSearch(''); }}>
                              <p className="font-medium">{d.code}</p>
                              <p className="text-xs text-muted-foreground truncate">{d.title}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Input {...form.register('category')} placeholder="Ex: Segurança, ISO..." />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Controller control={form.control} name="status" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Duração (h)</Label>
              <Input type="number" step="0.5" min="0.5" {...form.register('durationHours')} placeholder="8" />
            </div>
            <div className="space-y-1.5">
              <Label>Validade (meses)</Label>
              <Input type="number" min="1" {...form.register('validityMonths')} placeholder="12" />
            </div>
            <div className="space-y-1.5">
              <Label>Nota mínima (%)</Label>
              <Input type="number" min="0" max="100" {...form.register('passingScore')} placeholder="70" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" loading={mutation.isPending}>{editing ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TrainingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Training | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Training | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['trainings', search, statusFilter],
    queryFn: () => trainingsService.findAll({
      ...(search ? { search } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      limit: 100,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => trainingsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainings'] });
      toast.success('Treinamento excluído');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Não é possível excluir: treinamento possui atribuições'),
  });

  const trainings = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Treinamentos</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie programas de capacitação e registros de conclusão</p>
        </div>
        <Button onClick={() => { setEditTarget(undefined); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Novo Treinamento
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar treinamentos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter || '__all__'} onValueChange={v => setStatusFilter(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="archived">Arquivado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-28 w-full" /></CardContent></Card>)}
        </div>
      ) : trainings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GraduationCap className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold mb-1">Nenhum treinamento encontrado</h3>
          <p className="text-sm text-muted-foreground">Crie um programa de treinamento para começar</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trainings.map(t => {
            const cfg = STATUS_CFG[t.status];
            return (
              <Card key={t.id} className="flex flex-col hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm leading-snug">{t.title}</CardTitle>
                    <Badge variant={cfg.variant} className="shrink-0 text-xs">{cfg.label}</Badge>
                  </div>
                  {t.category && <p className="text-xs text-muted-foreground">{t.category}</p>}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    {t.document && (
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3 w-3" />{t.document.code}
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      {t.durationHours && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t.durationHours}h</span>}
                      {t.validityMonths && <span>{t.validityMonths} meses de validade</span>}
                      {t.passingScore && <span>Aprovação: {t.passingScore}%</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3" />{t._count?.assignments ?? 0} atribuição(ões)
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/trainings/${t.id}`)}>
                      Ver detalhes
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditTarget(t); setFormOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(t)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TrainingFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editTarget}
        onSaved={() => qc.invalidateQueries({ queryKey: ['trainings'] })}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
        title="Excluir Treinamento"
        description={`Deseja excluir "${deleteTarget?.title}"? Esta ação não poderá ser desfeita.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
