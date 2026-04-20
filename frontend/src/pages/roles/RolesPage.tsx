import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Shield, Lock } from 'lucide-react';
import { rolesService } from '@/services/users.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { Role, Permission } from '@/types';

const formSchema = z.object({
  name:          z.string().min(2, 'Nome obrigatório').toUpperCase(),
  description:   z.string().optional(),
  permissionIds: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof formSchema>;

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Role;
  permissions: Permission[];
  onSaved: () => void;
}

const RESOURCE_LABELS: Record<string, string> = {
  documents: 'Documentos', 'document-types': 'Tipos de Documento',
  workflows: 'Workflows', approvals: 'Aprovações',
  users: 'Usuários', roles: 'Papéis', companies: 'Empresas',
  trainings: 'Treinamentos', distributions: 'Distribuições', audit: 'Auditoria',
};

function RoleFormDialog({ open, onOpenChange, editing, permissions, onSaved }: RoleFormDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: editing
      ? { name: editing.name, description: editing.description ?? '', permissionIds: editing.permissions?.map(p => p.id) ?? [] }
      : { permissionIds: [] },
  });

  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      editing ? rolesService.update(editing.id, v) : rolesService.create(v),
    onSuccess: () => {
      toast.success(editing ? 'Papel atualizado' : 'Papel criado');
      onSaved(); onOpenChange(false); form.reset();
    },
    onError: () => toast.error('Erro ao salvar papel'),
  });

  // Group permissions by resource
  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const key = p.resource;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const selectedIds = form.watch('permissionIds');

  const toggleAll = (resource: string, checked: boolean) => {
    const resourceIds = (grouped[resource] ?? []).map(p => p.id);
    const current = form.getValues('permissionIds');
    if (checked) {
      form.setValue('permissionIds', [...new Set([...current, ...resourceIds])]);
    } else {
      form.setValue('permissionIds', current.filter(id => !resourceIds.includes(id)));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? 'Editar Papel' : 'Novo Papel'}</DialogTitle></DialogHeader>
        <form onSubmit={form.handleSubmit(v => mutation.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input {...form.register('name')} placeholder="Ex: GESTOR_DOCUMENTOS" className="uppercase" />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea {...form.register('description')} rows={1} placeholder="Descreva as responsabilidades..." />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Permissões</Label>
            <div className="border rounded-md divide-y max-h-72 overflow-y-auto">
              {Object.entries(grouped).map(([resource, perms]) => {
                const allSelected = perms.every(p => selectedIds.includes(p.id));
                const someSelected = perms.some(p => selectedIds.includes(p.id));
                return (
                  <div key={resource} className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <input type="checkbox" className="h-4 w-4 accent-primary"
                        checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                        onChange={e => toggleAll(resource, e.target.checked)} />
                      <span className="font-medium text-sm">{RESOURCE_LABELS[resource] ?? resource}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 ml-6">
                      {perms.map(p => (
                        <Controller key={p.id} control={form.control} name="permissionIds" render={({ field }) => (
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" className="h-3.5 w-3.5 accent-primary"
                              checked={(field.value).includes(p.id)}
                              onChange={e => {
                                field.onChange(e.target.checked
                                  ? [...field.value, p.id]
                                  : field.value.filter(id => id !== p.id));
                              }}
                            />
                            <span className="text-muted-foreground">{p.action}</span>
                          </label>
                        )} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{selectedIds.length} permissão(ões) selecionada(s)</p>
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

export function RolesPage() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Role | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesService.findAll({ limit: 100 }),
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => rolesService.findAllPermissions(),
  });

  const { data: rolesWithPerms } = useQuery({
    queryKey: ['roles', 'detail', editTarget?.id],
    queryFn: () => rolesService.findById(editTarget!.id),
    enabled: !!editTarget,
  });

  const roles = data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rolesService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Papel excluído'); setDeleteTarget(null); },
    onError: () => toast.error('Não é possível excluir: papel em uso'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Papéis e Permissões</h1>
          <p className="text-muted-foreground text-sm mt-1">Controle de acesso baseado em papéis (RBAC)</p>
        </div>
        <Button onClick={() => { setEditTarget(undefined); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Novo Papel
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : roles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold mb-1">Nenhum papel cadastrado</h3>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map(r => (
            <Card key={r.id} className="flex flex-col">
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Shield className="h-4 w-4 text-primary shrink-0" />
                  <CardTitle className="text-sm truncate">{r.name}</CardTitle>
                </div>
                {r.isSystem && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-label="Papel do sistema" />}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between gap-3">
                {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => { setEditTarget(r); setFormOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {!r.isSystem && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(r)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RoleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editTarget ? (rolesWithPerms ?? editTarget) : undefined}
        permissions={permissions}
        onSaved={() => qc.invalidateQueries({ queryKey: ['roles'] })}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
        title="Excluir Papel"
        description={`Deseja excluir "${deleteTarget?.name}"?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
