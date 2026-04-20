import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { workflowsService } from '@/services/workflows.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import type { WorkflowTemplate } from '@/types';

export function WorkflowsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<WorkflowTemplate | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowsService.findAll({ limit: 100 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workflowsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow excluído');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Erro ao excluir workflow'),
  });

  const templates = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflows de Aprovação</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie templates de fluxo de aprovação</p>
        </div>
        <Button onClick={() => navigate('/workflows/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Workflow
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          title="Nenhum workflow cadastrado"
          description="Crie um template de workflow para iniciar processos de aprovação"
          action={<Button onClick={() => navigate('/workflows/new')}><Plus className="h-4 w-4 mr-2" />Criar Workflow</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((wf) => (
            <Card key={wf.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{wf.name}</CardTitle>
                  {wf.isActive ? (
                    <Badge variant="success" className="shrink-0"><CheckCircle2 className="h-3 w-3 mr-1" />Ativo</Badge>
                  ) : (
                    <Badge variant="muted" className="shrink-0"><XCircle className="h-3 w-3 mr-1" />Inativo</Badge>
                  )}
                </div>
                {wf.description && <p className="text-xs text-muted-foreground mt-1">{wf.description}</p>}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  {wf.documentType && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium">Tipo:</span>
                      <Badge variant="outline">{wf.documentType.name}</Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">Etapas:</span>
                    <span>{wf.steps?.length ?? 0} etapa(s)</span>
                  </div>
                  {(wf._count?.requests ?? 0) > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Aprovações:</span> {wf._count!.requests}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/workflows/${wf.id}/edit`)}>
                    <Pencil className="h-3 w-3 mr-1" />Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteTarget(wf)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Excluir Workflow"
        description={`Deseja excluir o workflow "${deleteTarget?.name}"? Esta ação não poderá ser desfeita.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
