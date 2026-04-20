import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Pencil, Trash2, Building2, Users, FileText } from 'lucide-react';
import { companiesService } from '@/services/companies.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Controller } from 'react-hook-form';
import type { Company } from '@/types';

const formSchema = z.object({
  name:     z.string().min(2, 'Nome obrigatório'),
  cnpj:     z.string().optional(),
  email:    z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone:    z.string().optional(),
  plan:     z.enum(['basic', 'professional', 'enterprise']).default('basic'),
  isActive: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const PLAN_LABELS: Record<string, { label: string; variant: 'muted' | 'info' | 'success' }> = {
  basic:        { label: 'Básico',        variant: 'muted' },
  professional: { label: 'Profissional',  variant: 'info' },
  enterprise:   { label: 'Enterprise',    variant: 'success' },
};

interface CompanyFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Company;
  onSaved: () => void;
}

function CompanyFormDialog({ open, onOpenChange, editing, onSaved }: CompanyFormDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: editing
      ? { name: editing.name, cnpj: editing.cnpj ?? '', email: editing.email ?? '', phone: editing.phone ?? '', plan: editing.plan as FormValues['plan'], isActive: editing.isActive }
      : { plan: 'basic', isActive: true },
  });

  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      editing ? companiesService.update(editing.id, v) : companiesService.create(v),
    onSuccess: () => {
      toast.success(editing ? 'Empresa atualizada' : 'Empresa criada');
      onSaved(); onOpenChange(false); form.reset();
    },
    onError: () => toast.error('Erro ao salvar empresa'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle></DialogHeader>
        <form onSubmit={form.handleSubmit(v => mutation.mutate(v))} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input {...form.register('name')} placeholder="Razão social" />
            {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>CNPJ</Label>
              <Input {...form.register('cnpj')} placeholder="00.000.000/0001-00" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input {...form.register('phone')} placeholder="(11) 9 9999-9999" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input {...form.register('email')} placeholder="contato@empresa.com" />
              {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Plano</Label>
              <Controller control={form.control} name="plan" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Básico</SelectItem>
                    <SelectItem value="professional">Profissional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>
          {editing && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" className="h-4 w-4 accent-primary" {...form.register('isActive')} />
              <Label htmlFor="isActive" className="cursor-pointer">Empresa ativa</Label>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" loading={mutation.isPending}>{editing ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CompaniesPage() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Company | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesService.findAll({ limit: 100 }),
  });
  const companies = data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => companiesService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); toast.success('Empresa excluída'); setDeleteTarget(null); },
    onError: () => toast.error('Não é possível excluir esta empresa'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Empresas</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerenciamento de tenants do sistema</p>
        </div>
        <Button onClick={() => { setEditTarget(undefined); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Nova Empresa
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold mb-1">Nenhuma empresa cadastrada</h3>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map(c => {
            const plan = PLAN_LABELS[c.plan] ?? { label: c.plan, variant: 'muted' as const };
            return (
              <Card key={c.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm leading-snug">{c.name}</CardTitle>
                    <div className="flex gap-1 shrink-0">
                      <Badge variant={plan.variant} className="text-xs">{plan.label}</Badge>
                      <Badge variant={c.isActive ? 'success' : 'muted'} className="text-xs">
                        {c.isActive ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {c.cnpj && <p>{c.cnpj}</p>}
                    {c.email && <p>{c.email}</p>}
                    {c.phone && <p>{c.phone}</p>}
                    {c._count && (
                      <div className="flex items-center gap-3 pt-1">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c._count.users} usuários</span>
                        <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{c._count.documents} docs</span>
                      </div>
                    )}
                    <p className="text-muted-foreground/60">Desde {format(new Date(c.createdAt), 'MMM/yyyy', { locale: ptBR })}</p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => { setEditTarget(c); setFormOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(c)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CompanyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editTarget}
        onSaved={() => qc.invalidateQueries({ queryKey: ['companies'] })}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
        title="Excluir Empresa"
        description={`Deseja excluir "${deleteTarget?.name}"? Todos os dados associados serão removidos.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
