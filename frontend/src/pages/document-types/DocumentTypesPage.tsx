import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, FolderOpen, FileText } from 'lucide-react';
import { documentTypesService } from '@/services/document-types.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { DocumentType } from '@/types';

const formSchema = z.object({
  name:           z.string().min(2, 'Nome obrigatório'),
  code:           z.string().min(2, 'Código obrigatório').max(20).toUpperCase(),
  prefix:         z.string().min(1, 'Prefixo obrigatório').max(10).toUpperCase(),
  description:    z.string().optional(),
  retentionYears: z.coerce.number().int().min(1).max(100).optional(),
  isActive:       z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface DocTypeFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: DocumentType;
  onSaved: () => void;
}

function DocTypeFormDialog({ open, onOpenChange, editing, onSaved }: DocTypeFormDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: editing
      ? { name: editing.name, code: editing.code, prefix: editing.prefix, description: editing.description ?? '', retentionYears: editing.retentionYears, isActive: editing.isActive }
      : { isActive: true },
  });

  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      editing ? documentTypesService.update(editing.id, v) : documentTypesService.create(v),
    onSuccess: () => {
      toast.success(editing ? 'Tipo atualizado' : 'Tipo criado');
      onSaved(); onOpenChange(false); form.reset();
    },
    onError: () => toast.error('Erro ao salvar tipo de documento'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? 'Editar Tipo' : 'Novo Tipo de Documento'}</DialogTitle></DialogHeader>
        <form onSubmit={form.handleSubmit(v => mutation.mutate(v))} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input {...form.register('name')} placeholder="Ex: Procedimento Operacional Padrão" />
            {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Código *</Label>
              <Input {...form.register('code')} placeholder="POP" className="uppercase" />
              {form.formState.errors.code && <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Prefixo *</Label>
              <Input {...form.register('prefix')} placeholder="POP" className="uppercase" />
              {form.formState.errors.prefix && <p className="text-xs text-destructive">{form.formState.errors.prefix.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Retenção (anos)</Label>
              <Input type="number" min="1" max="100" {...form.register('retentionYears')} placeholder="5" />
            </div>
            {editing && (
              <div className="flex items-end pb-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-primary" {...form.register('isActive')} />
                  Tipo ativo
                </label>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea {...form.register('description')} rows={2} placeholder="Descrição do tipo de documento..." />
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

export function DocumentTypesPage() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DocumentType | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<DocumentType | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['document-types'],
    queryFn: () => documentTypesService.findAll({ limit: 100 }),
  });
  const types = data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentTypesService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['document-types'] }); toast.success('Tipo excluído'); setDeleteTarget(null); },
    onError: () => toast.error('Não é possível excluir: tipo em uso por documentos'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tipos de Documento</h1>
          <p className="text-muted-foreground text-sm mt-1">Categorias e prefixos para classificação de documentos</p>
        </div>
        <Button onClick={() => { setEditTarget(undefined); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Novo Tipo
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : types.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold mb-1">Nenhum tipo cadastrado</h3>
          <p className="text-sm text-muted-foreground">Crie tipos para classificar seus documentos</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {types.map(t => (
            <Card key={t.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm leading-snug">{t.name}</CardTitle>
                  <Badge variant={t.isActive ? 'success' : 'muted'} className="text-xs shrink-0">
                    {t.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between gap-3">
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{t.code}</span>
                    <span>Prefixo: <span className="font-mono">{t.prefix}</span></span>
                  </div>
                  {t.retentionYears && <p>Retenção: {t.retentionYears} anos</p>}
                  {t._count && (
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />{t._count.documents} documento(s)
                    </div>
                  )}
                  {t.description && <p className="line-clamp-2">{t.description}</p>}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => { setEditTarget(t); setFormOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(t)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DocTypeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editTarget}
        onSaved={() => qc.invalidateQueries({ queryKey: ['document-types'] })}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
        title="Excluir Tipo de Documento"
        description={`Deseja excluir "${deleteTarget?.name}"? Documentos associados não serão excluídos.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
