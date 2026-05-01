import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, Users, Shield, CheckCircle2, XCircle, Check } from 'lucide-react';
import { usersService, rolesService } from '@/services/users.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { User } from '@/types';

const SPECIAL_CHARS = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

const passwordRules = [
  { label: 'Mínimo 8 caracteres',        test: (v: string) => v.length >= 8 },
  { label: 'Letra maiúscula (A-Z)',       test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Letra minúscula (a-z)',       test: (v: string) => /[a-z]/.test(v) },
  { label: 'Número (0-9)',               test: (v: string) => /\d/.test(v) },
  { label: 'Símbolo (!@#$%...)',          test: (v: string) => SPECIAL_CHARS.test(v) },
];

const passwordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .max(128, 'Máximo 128 caracteres')
  .regex(/[A-Z]/, 'Precisa de letra maiúscula')
  .regex(/[a-z]/, 'Precisa de letra minúscula')
  .regex(/\d/, 'Precisa de número')
  .regex(SPECIAL_CHARS, 'Precisa de símbolo (!@#$%...)');

const createSchema = z.object({
  name:     z.string().min(2, 'Nome obrigatório'),
  email:    z.string().email('E-mail inválido'),
  password: passwordSchema,
  roleIds:  z.array(z.string()).min(1, 'Selecione ao menos um papel'),
});

const editSchema = z.object({
  name:     z.string().min(2).optional(),
  email:    z.string().email().optional(),
  password: passwordSchema.optional().or(z.literal('')),
  roleIds:  z.array(z.string()).min(1, 'Selecione ao menos um papel'),
  isActive: z.boolean().optional(),
});

function PasswordRulesHint({ value }: { value: string }) {
  if (!value) return null;
  return (
    <ul className="mt-1.5 space-y-0.5">
      {passwordRules.map(rule => {
        const ok = rule.test(value);
        return (
          <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-muted-foreground'}`}>
            <Check className={`h-3 w-3 shrink-0 ${ok ? 'opacity-100' : 'opacity-30'}`} />
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

type CreateForm = z.infer<typeof createSchema>;
type EditForm   = z.infer<typeof editSchema>;

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: User;
  onSaved: () => void;
}

function UserFormDialog({ open, onOpenChange, editing, onSaved }: UserFormDialogProps) {
  const { data: rolesData } = useQuery({
    queryKey: ['roles', 'all'],
    queryFn: () => rolesService.findAll({ limit: 100 }),
  });
  const allRoles = rolesData?.data ?? [];

  const form = useForm<CreateForm | EditForm>({
    resolver: zodResolver(editing ? editSchema : createSchema),
    defaultValues: editing
      ? { name: editing.name, email: editing.email, password: '', roleIds: editing.roles.map(r => r.id), isActive: editing.isActive }
      : { roleIds: [] },
  });

  const mutation = useMutation({
    mutationFn: (v: CreateForm | EditForm) => {
      if (editing) {
        const payload: Record<string, unknown> = { name: v.name, email: v.email, roleIds: v.roleIds, isActive: (v as EditForm).isActive };
        if ((v as EditForm).password) payload.password = (v as EditForm).password;
        return usersService.update(editing.id, payload);
      }
      return usersService.create(v);
    },
    onSuccess: () => {
      toast.success(editing ? 'Usuário atualizado' : 'Usuário criado');
      onSaved(); onOpenChange(false); form.reset();
    },
    onError: () => toast.error('Erro ao salvar usuário'),
  });

  const selectedRoles  = form.watch('roleIds') as string[];
  const passwordValue  = form.watch('password') as string;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle></DialogHeader>
        <form onSubmit={form.handleSubmit(v => mutation.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input {...form.register('name')} placeholder="Nome completo" />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>E-mail *</Label>
              <Input {...form.register('email')} placeholder="email@empresa.com" />
              {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{editing ? 'Nova senha (deixe vazio para manter)' : 'Senha *'}</Label>
            <Input type="password" {...form.register('password')} placeholder="••••••••" />
            <PasswordRulesHint value={passwordValue ?? ''} />
            {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Papéis *</Label>
            <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
              {allRoles.map(r => (
                <Controller key={r.id} control={form.control} name="roleIds" render={({ field }) => (
                  <label className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 accent-primary"
                      checked={(field.value as string[]).includes(r.id)}
                      onChange={e => {
                        const current = field.value as string[];
                        field.onChange(e.target.checked ? [...current, r.id] : current.filter(id => id !== r.id));
                      }}
                    />
                    <span>{r.name}</span>
                    {r.description && <span className="text-muted-foreground text-xs">— {r.description}</span>}
                  </label>
                )} />
              ))}
            </div>
            {form.formState.errors.roleIds && <p className="text-xs text-destructive">{form.formState.errors.roleIds.message}</p>}
            {selectedRoles.length > 0 && (
              <p className="text-xs text-muted-foreground">{selectedRoles.length} papel(éis) selecionado(s)</p>
            )}
          </div>
          {editing && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" className="h-4 w-4 accent-primary"
                {...form.register('isActive')} />
              <Label htmlFor="isActive" className="cursor-pointer">Usuário ativo</Label>
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

export function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () => usersService.findAll({ limit: 100, ...(search ? { search } : {}) }),
  });
  const users = data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Usuário excluído'); setDeleteTarget(null); },
    onError: () => toast.error('Não é possível excluir este usuário'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie os usuários da empresa</p>
        </div>
        <Button onClick={() => { setEditTarget(undefined); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Novo Usuário
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar usuários..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold mb-1">Nenhum usuário encontrado</h3>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{u.name}</p>
                      {u.isMaster && <Badge variant="info" className="text-xs">Master</Badge>}
                      <Badge variant={u.isActive ? 'success' : 'muted'} className="text-xs">
                        {u.isActive
                          ? <><CheckCircle2 className="h-3 w-3 mr-1" />Ativo</>
                          : <><XCircle className="h-3 w-3 mr-1" />Inativo</>}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                    {u.roles.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Shield className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{u.roles.map(r => r.name).join(', ')}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => { setEditTarget(u); setFormOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(u)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editTarget}
        onSaved={() => qc.invalidateQueries({ queryKey: ['users'] })}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
        title="Excluir Usuário"
        description={`Deseja excluir "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
