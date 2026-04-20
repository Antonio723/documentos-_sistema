import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft, Users, Plus, CheckCircle2, Clock, AlertCircle,
  XCircle, X, FileText, GraduationCap, Award
} from 'lucide-react';
import { trainingsService } from '@/services/trainings.service';
import { usersService } from '@/services/users.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import type { AssignmentStatus, TrainingAssignment, User } from '@/types';
import { cn } from '@/lib/utils';

const ASSIGNMENT_CFG: Record<AssignmentStatus, { label: string; variant: 'warning' | 'success' | 'destructive' | 'muted' | 'info'; icon: React.ElementType }> = {
  pending:     { label: 'Pendente',   variant: 'warning',     icon: Clock },
  in_progress: { label: 'Em andamento', variant: 'info',      icon: Clock },
  completed:   { label: 'Concluído',  variant: 'success',     icon: CheckCircle2 },
  overdue:     { label: 'Atrasado',   variant: 'destructive', icon: AlertCircle },
  cancelled:   { label: 'Cancelado',  variant: 'muted',       icon: XCircle },
};

const assignSchema = z.object({
  dueDate: z.string().optional(),
  notes:   z.string().optional(),
});

const completionSchema = z.object({
  score:  z.coerce.number().int().min(0).max(100).optional(),
  passed: z.boolean().default(true),
  notes:  z.string().optional(),
});

type AssignForm     = z.infer<typeof assignSchema>;
type CompletionForm = z.infer<typeof completionSchema>;

export function TrainingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [completionTarget, setCompletionTarget] = useState<TrainingAssignment | null>(null);

  const { data: training, isLoading } = useQuery({
    queryKey: ['training', id],
    queryFn: () => trainingsService.findById(id!),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => usersService.findAll({ limit: 200 }),
  });

  const allUsers = usersData?.data ?? [];
  const assignedUserIds = training?.assignments?.map(a => a.userId) ?? [];
  const filteredUsers = allUsers.filter(u =>
    !selectedUsers.find(s => s.id === u.id) &&
    !assignedUserIds.includes(u.id) &&
    (userSearch === '' ||
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const assignForm = useForm<AssignForm>({ resolver: zodResolver(assignSchema) });
  const completionForm = useForm<CompletionForm>({ resolver: zodResolver(completionSchema), defaultValues: { passed: true } });

  const assignMutation = useMutation({
    mutationFn: (v: AssignForm) =>
      trainingsService.assign(id!, {
        userIds: selectedUsers.map(u => u.id),
        dueDate: v.dueDate ? new Date(v.dueDate).toISOString() : undefined,
        notes: v.notes,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['training', id] });
      toast.success(`${data.length} usuário(s) atribuído(s)`);
      setAssignOpen(false);
      setSelectedUsers([]);
      assignForm.reset();
    },
    onError: () => toast.error('Erro ao atribuir usuários'),
  });

  const completionMutation = useMutation({
    mutationFn: (v: CompletionForm) =>
      trainingsService.recordCompletion(completionTarget!.id, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training', id] });
      toast.success('Conclusão registrada');
      setCompletionTarget(null);
      completionForm.reset({ passed: true });
    },
    onError: () => toast.error('Erro ao registrar conclusão'),
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (!training) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/trainings')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate">{training.title}</h1>
            <Badge variant={training.status === 'active' ? 'success' : 'muted'}>
              {training.status === 'active' ? 'Ativo' : training.status === 'draft' ? 'Rascunho' : 'Arquivado'}
            </Badge>
          </div>
          {training.category && <p className="text-sm text-muted-foreground">{training.category}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Atribuições', value: training._count?.assignments ?? 0, icon: Users },
          { label: 'Duração', value: training.durationHours ? `${training.durationHours}h` : '—', icon: Clock },
          { label: 'Validade', value: training.validityMonths ? `${training.validityMonths} meses` : '—', icon: Award },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Icon className="h-8 w-8 text-primary/60" />
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {training.description && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm">{training.description}</p>
          </CardContent>
        </Card>
      )}

      {training.document && (
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Documento vinculado</p>
              <Button variant="link" className="h-auto p-0 text-sm font-medium" onClick={() => navigate(`/documents/${training.documentId}`)}>
                {training.document.code} — {training.document.title}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Participantes ({training.assignments?.length ?? 0})</CardTitle>
          {training.status === 'active' && (
            <Button size="sm" onClick={() => setAssignOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Atribuir
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {(training.assignments?.length ?? 0) === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <GraduationCap className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              Nenhum participante atribuído
            </div>
          ) : (
            <div className="space-y-2">
              {training.assignments!.map(a => {
                const cfg = ASSIGNMENT_CFG[a.status];
                const Icon = cfg.icon;
                return (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{a.user.name}</p>
                        <Badge variant={cfg.variant} className="text-xs shrink-0">
                          <Icon className="h-3 w-3 mr-1" />{cfg.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{a.user.email}</p>
                      {a.dueDate && (
                        <p className={cn('text-xs', a.status === 'overdue' ? 'text-destructive' : 'text-muted-foreground')}>
                          Prazo: {format(new Date(a.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      )}
                      {a.completion && (
                        <p className="text-xs text-green-600">
                          Concluído em {format(new Date(a.completion.completedAt), 'dd/MM/yyyy', { locale: ptBR })}
                          {a.completion.score != null && ` — Nota: ${a.completion.score}%`}
                          {a.completion.expiresAt && ` — Válido até ${format(new Date(a.completion.expiresAt), 'dd/MM/yyyy', { locale: ptBR })}`}
                        </p>
                      )}
                    </div>
                    {!a.completion && a.status !== 'cancelled' && (
                      <Button size="sm" variant="outline" onClick={() => setCompletionTarget(a)}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Registrar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Modal */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Atribuir Treinamento</DialogTitle></DialogHeader>
          <form onSubmit={assignForm.handleSubmit(v => assignMutation.mutate(v))} className="space-y-4">
            <div className="space-y-2">
              <Label>Participantes *</Label>
              <Input placeholder="Buscar usuário..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              {userSearch && filteredUsers.length > 0 && (
                <div className="border rounded-md divide-y max-h-36 overflow-y-auto">
                  {filteredUsers.slice(0, 6).map(u => (
                    <button key={u.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                      onClick={() => { setSelectedUsers(p => [...p, u]); setUserSearch(''); }}>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </button>
                  ))}
                </div>
              )}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/30">
                  {selectedUsers.map(u => (
                    <Badge key={u.id} variant="secondary" className="flex items-center gap-1 pr-1">
                      {u.name}
                      <button type="button" onClick={() => setSelectedUsers(p => p.filter(x => x.id !== u.id))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prazo</Label>
                <Input type="date" {...assignForm.register('dueDate')} />
              </div>
              <div className="space-y-1.5">
                <Label>Observações</Label>
                <Input {...assignForm.register('notes')} placeholder="Opcional..." />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={assignMutation.isPending} disabled={selectedUsers.length === 0}>Atribuir</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Completion Modal */}
      <Dialog open={!!completionTarget} onOpenChange={o => !o && setCompletionTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Conclusão</DialogTitle>
            <p className="text-sm text-muted-foreground">{completionTarget?.user.name}</p>
          </DialogHeader>
          <form onSubmit={completionForm.handleSubmit(v => completionMutation.mutate(v))} className="space-y-4">
            {training.passingScore != null && (
              <div className="space-y-1.5">
                <Label>Nota obtida (%)</Label>
                <Input type="number" min="0" max="100" {...completionForm.register('score')}
                  placeholder={`Mínimo para aprovação: ${training.passingScore}%`} />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input type="checkbox" id="passed" className="h-4 w-4 rounded border-input accent-primary"
                {...completionForm.register('passed')} />
              <Label htmlFor="passed" className="cursor-pointer">Participante aprovado</Label>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea {...completionForm.register('notes')} rows={2} placeholder="Observações sobre o desempenho..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCompletionTarget(null)}>Cancelar</Button>
              <Button type="submit" loading={completionMutation.isPending}>Registrar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
