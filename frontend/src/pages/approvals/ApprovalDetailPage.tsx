import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ArrowLeft, CheckCircle2, XCircle, MessageSquare, Clock, User,
  Shield, FileText, AlertCircle, Ban
} from 'lucide-react';
import { approvalsService } from '@/services/approvals.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { ApprovalActionType, ApprovalStatus, ApprovalRequest } from '@/types';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; variant: 'warning' | 'success' | 'destructive' | 'muted' }> = {
  pending:     { label: 'Pendente',     variant: 'muted' },
  in_progress: { label: 'Em Andamento', variant: 'warning' },
  approved:    { label: 'Aprovado',     variant: 'success' },
  rejected:    { label: 'Rejeitado',    variant: 'destructive' },
  cancelled:   { label: 'Cancelado',   variant: 'muted' },
};

const ACTION_CONFIG: Record<ApprovalActionType, { label: string; color: string; icon: React.ElementType }> = {
  approve:         { label: 'Aprovado',           color: 'text-green-600', icon: CheckCircle2 },
  reject:          { label: 'Rejeitado',           color: 'text-red-600',   icon: XCircle },
  request_changes: { label: 'Solicitou Alterações', color: 'text-yellow-600', icon: MessageSquare },
};

const actSchema = z.object({
  comment: z.string().optional(),
});

type ActForm = z.infer<typeof actSchema>;

interface ActModalProps {
  open: boolean;
  onClose: () => void;
  action: ApprovalActionType;
  onConfirm: (comment?: string) => void;
  loading: boolean;
}

function ActModal({ open, onClose, action, onConfirm, loading }: ActModalProps) {
  const form = useForm<ActForm>({ resolver: zodResolver(actSchema) });
  const cfg = ACTION_CONFIG[action];
  const Icon = cfg.icon;

  const submit = (v: ActForm) => onConfirm(v.comment || undefined);

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={cn('flex items-center gap-2', cfg.color)}>
            <Icon className="h-5 w-5" />
            {action === 'approve' ? 'Confirmar Aprovação' : action === 'reject' ? 'Rejeitar Documento' : 'Solicitar Alterações'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="comment">
              Comentário {action !== 'approve' && <span className="text-muted-foreground">(opcional)</span>}
            </Label>
            <Textarea
              id="comment"
              {...form.register('comment')}
              rows={3}
              placeholder={action === 'approve' ? 'Comentário opcional...' : 'Descreva o motivo...'}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              type="submit"
              loading={loading}
              variant={action === 'approve' ? 'default' : 'destructive'}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StepTimeline({ approval }: { approval: ApprovalRequest }) {
  const steps = approval.workflowTemplate.steps;

  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const action = approval.actions.find(a => a.stepOrder === step.order);
        const isCurrent = approval.status === 'in_progress' && approval.currentStep === step.order;
        const isPast = action != null;
        const actionCfg = action ? ACTION_CONFIG[action.action] : null;
        const ActionIcon = actionCfg?.icon ?? Clock;

        return (
          <div key={step.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center border-2 z-10 shrink-0',
                isPast && action?.action === 'approve' ? 'border-green-500 bg-green-50 text-green-600' :
                isPast ? 'border-red-500 bg-red-50 text-red-600' :
                isCurrent ? 'border-primary bg-primary/10 text-primary' :
                'border-muted bg-background text-muted-foreground'
              )}>
                {isPast ? (
                  <ActionIcon className="h-4 w-4" />
                ) : isCurrent ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-bold">{index + 1}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={cn('w-0.5 flex-1 my-1', isPast ? 'bg-primary/30' : 'bg-border')} style={{ minHeight: '24px' }} />
              )}
            </div>

            <div className={cn('pb-6 flex-1', index === steps.length - 1 && 'pb-0')}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={cn('font-medium text-sm', isCurrent && 'text-primary')}>{step.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                    {step.approverUser ? (
                      <><User className="h-3 w-3" />{step.approverUser.name}</>
                    ) : step.approverRole ? (
                      <><Shield className="h-3 w-3" />{step.approverRole.name}</>
                    ) : null}
                    {step.slaHours && <span className="ml-2">SLA: {step.slaHours}h</span>}
                  </div>
                </div>
                {action && (
                  <Badge variant={action.action === 'approve' ? 'success' : 'destructive'} className="text-xs shrink-0">
                    {actionCfg?.label}
                  </Badge>
                )}
                {isCurrent && !action && (
                  <Badge variant="warning" className="text-xs shrink-0">Aguardando</Badge>
                )}
              </div>

              {action && (
                <div className="mt-2 p-2 rounded-md bg-muted/50 text-xs space-y-1">
                  <p className="text-muted-foreground">
                    {action.userName} — {new Date(action.createdAt).toLocaleString('pt-BR')}
                  </p>
                  {action.comment && <p className="text-foreground">{action.comment}</p>}
                  <p className="text-muted-foreground/60 font-mono text-[10px] truncate">
                    Assinatura: {action.signature.slice(0, 32)}…
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [actModal, setActModal] = useState<ApprovalActionType | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data: approval, isLoading } = useQuery({
    queryKey: ['approval', id],
    queryFn: () => approvalsService.findById(id!),
  });

  const actMutation = useMutation({
    mutationFn: ({ action, comment }: { action: ApprovalActionType; comment?: string }) =>
      approvalsService.act(id!, action, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval', id] });
      qc.invalidateQueries({ queryKey: ['approvals'] });
      toast.success('Ação registrada com sucesso');
      setActModal(null);
    },
    onError: () => toast.error('Erro ao registrar ação'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => approvalsService.cancel(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval', id] });
      qc.invalidateQueries({ queryKey: ['approvals'] });
      toast.success('Aprovação cancelada');
      setCancelOpen(false);
    },
    onError: () => toast.error('Erro ao cancelar'),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!approval) return null;

  const cfg = STATUS_CONFIG[approval.status];
  const canAct = approval.status === 'in_progress';
  const canCancel = approval.status === 'in_progress';

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/approvals')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight truncate">{approval.document.title}</h1>
            <Badge variant={cfg.variant}>{cfg.label}</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            {approval.document.code} — {approval.workflowTemplate.name}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Solicitado por</p>
            <p className="font-medium text-sm mt-1">{approval.requestedBy.name}</p>
            <p className="text-xs text-muted-foreground">{new Date(approval.createdAt).toLocaleDateString('pt-BR')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Progresso</p>
            <p className="font-medium text-sm mt-1">Etapa {approval.currentStep} / {approval.totalSteps}</p>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-2">
              <div
                className="h-full bg-primary"
                style={{ width: `${(approval.currentStep / approval.totalSteps) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Documento</p>
            <Button
              variant="link"
              className="h-auto p-0 text-sm font-medium mt-1"
              onClick={() => navigate(`/documents/${approval.documentId}`)}
            >
              <FileText className="h-3.5 w-3.5 mr-1" />
              Ver Documento
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Trilha de Aprovação</CardTitle></CardHeader>
        <CardContent>
          <StepTimeline approval={approval} />
        </CardContent>
      </Card>

      {canAct && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              Sua ação é necessária nesta etapa
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setActModal('approve')} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4 mr-2" />Aprovar
              </Button>
              <Button variant="outline" onClick={() => setActModal('request_changes')}>
                <MessageSquare className="h-4 w-4 mr-2" />Solicitar Alterações
              </Button>
              <Button variant="destructive" onClick={() => setActModal('reject')}>
                <XCircle className="h-4 w-4 mr-2" />Rejeitar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {canCancel && (
        <div className="flex justify-end">
          <Button variant="ghost" className="text-muted-foreground" onClick={() => setCancelOpen(true)}>
            <Ban className="h-4 w-4 mr-2" />Cancelar Aprovação
          </Button>
        </div>
      )}

      {actModal && (
        <ActModal
          open={true}
          onClose={() => setActModal(null)}
          action={actModal}
          onConfirm={(comment) => actMutation.mutate({ action: actModal, comment })}
          loading={actMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar Aprovação"
        description="Deseja cancelar este processo de aprovação? O documento voltará ao status anterior."
        onConfirm={() => cancelMutation.mutate()}
        loading={cancelMutation.isPending}
        confirmLabel="Cancelar Aprovação"
        variant="destructive"
      />
    </div>
  );
}
