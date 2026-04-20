import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GraduationCap, Clock, CheckCircle2, AlertCircle, XCircle, Award, ExternalLink } from 'lucide-react';
import { trainingsService } from '@/services/trainings.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { AssignmentStatus } from '@/types';
import { cn } from '@/lib/utils';

const STATUS_CFG: Record<AssignmentStatus, { label: string; variant: 'warning' | 'success' | 'destructive' | 'muted' | 'info'; icon: React.ElementType; color: string }> = {
  pending:     { label: 'Pendente',      variant: 'warning',     icon: Clock,        color: 'text-yellow-500' },
  in_progress: { label: 'Em andamento',  variant: 'info',        icon: Clock,        color: 'text-blue-500' },
  completed:   { label: 'Concluído',     variant: 'success',     icon: CheckCircle2, color: 'text-green-500' },
  overdue:     { label: 'Atrasado',      variant: 'destructive', icon: AlertCircle,  color: 'text-red-500' },
  cancelled:   { label: 'Cancelado',     variant: 'muted',       icon: XCircle,      color: 'text-gray-400' },
};

type Tab = 'pending' | 'completed' | 'all';

export function MyTrainingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('pending');

  const statusParam = activeTab === 'pending' ? 'pending' : activeTab === 'completed' ? 'completed' : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['my-trainings', activeTab],
    queryFn: () => trainingsService.findMine({ ...(statusParam ? { status: statusParam } : {}), limit: 100 }),
  });

  const { data: allData } = useQuery({
    queryKey: ['my-trainings', 'all'],
    queryFn: () => trainingsService.findMine({ limit: 200 }),
  });

  const items = data?.data ?? [];
  const allItems = allData?.data ?? [];

  const stats = {
    pending:   allItems.filter(a => ['pending', 'in_progress', 'overdue'].includes(a.status)).length,
    completed: allItems.filter(a => a.status === 'completed').length,
    overdue:   allItems.filter(a => a.status === 'overdue').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meus Treinamentos</h1>
        <p className="text-muted-foreground text-sm mt-1">Acompanhe seus programas de capacitação</p>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
        {[
          { label: 'Pendentes',  value: stats.pending,   icon: Clock,        color: 'text-yellow-500' },
          { label: 'Concluídos', value: stats.completed, icon: CheckCircle2, color: 'text-green-500' },
          { label: 'Atrasados',  value: stats.overdue,   icon: AlertCircle,  color: 'text-red-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className={cn('h-4 w-4', color)} />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex rounded-lg border p-1 gap-1 w-fit">
        {(['pending', 'completed', 'all'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              activeTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab === 'pending' ? (
              <span className="flex items-center gap-1.5">
                Pendentes
                {stats.pending > 0 && (
                  <span className="bg-destructive text-destructive-foreground rounded-full text-xs px-1.5 py-0.5 leading-none">
                    {stats.pending}
                  </span>
                )}
              </span>
            ) : tab === 'completed' ? 'Concluídos' : 'Todos'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GraduationCap className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold mb-1">Nenhum treinamento</h3>
          <p className="text-sm text-muted-foreground">
            {activeTab === 'pending' ? 'Você não possui treinamentos pendentes.' : 'Nenhum registro nesta categoria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(assignment => {
            const cfg = STATUS_CFG[assignment.status];
            const Icon = cfg.icon;
            const isOverdue = assignment.status === 'overdue';

            return (
              <Card key={assignment.id} className={cn(isOverdue && 'border-destructive/40')}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {assignment.training.category && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">{assignment.training.category}</span>
                        )}
                        <Badge variant={cfg.variant} className="text-xs">
                          <Icon className="h-3 w-3 mr-1" />{cfg.label}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm">{assignment.training.title}</p>
                      {assignment.training.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{assignment.training.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-2 text-xs text-muted-foreground">
                        {assignment.training.durationHours && <span>{assignment.training.durationHours}h</span>}
                        {assignment.dueDate && (
                          <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                            Prazo: {format(new Date(assignment.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        )}
                        {assignment.completion && (
                          <>
                            <span className="text-green-600">
                              Concluído em {format(new Date(assignment.completion.completedAt), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                            {assignment.completion.score != null && (
                              <span className={cn('font-medium', assignment.completion.passed ? 'text-green-600' : 'text-red-600')}>
                                Nota: {assignment.completion.score}%
                              </span>
                            )}
                            {assignment.completion.expiresAt && (
                              <span className="flex items-center gap-1 text-orange-500">
                                <Award className="h-3 w-3" />
                                Válido até {format(new Date(assignment.completion.expiresAt), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      {assignment.training.document && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Documento: {assignment.training.document.code}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      title="Ver treinamento"
                      onClick={() => navigate(`/trainings/${assignment.trainingId}`)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
