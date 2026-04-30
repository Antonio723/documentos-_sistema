import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, CheckCircle2, XCircle, AlertCircle, Search, Eye } from 'lucide-react';
import { approvalsService } from '@/services/approvals.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ApprovalRequest, ApprovalStatus } from '@/types';

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; variant: 'warning' | 'success' | 'destructive' | 'muted'; icon: React.ElementType }> = {
  pending:     { label: 'Pendente',     variant: 'muted',        icon: Clock },
  in_progress: { label: 'Em Andamento', variant: 'warning',      icon: Clock },
  approved:    { label: 'Aprovado',     variant: 'success',      icon: CheckCircle2 },
  rejected:    { label: 'Rejeitado',    variant: 'destructive',  icon: XCircle },
  cancelled:   { label: 'Cancelado',   variant: 'muted',         icon: AlertCircle },
};

function ApprovalCard({ approval, onClick }: { approval: ApprovalRequest; onClick: () => void }) {
  const cfg = STATUS_CONFIG[approval.status];
  const Icon = cfg.icon;
  const progress = Math.round((approval.currentStep / approval.totalSteps) * 100);

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-muted-foreground">{approval.document.code}</span>
              <Badge variant={cfg.variant} className="text-xs">
                <Icon className="h-3 w-3 mr-1" />
                {cfg.label}
              </Badge>
            </div>
            <p className="font-medium text-sm mt-1 truncate">{approval.document.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Solicitado por {approval.requestedBy.name} • {approval.workflowTemplate.name}
            </p>
            {approval.status === 'in_progress' && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Etapa {approval.currentStep} de {approval.totalSteps}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type Tab = 'all' | 'my-pending';

export function ApprovalsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');

  const { data: allData, isLoading: loadingAll } = useQuery({
    queryKey: ['approvals', 'all'],
    queryFn: () => approvalsService.findAll({ limit: 100 }),
    enabled: activeTab === 'all',
  });

  const { data: pendingData, isLoading: loadingPending } = useQuery({
    queryKey: ['approvals', 'my-pending'],
    queryFn: () => approvalsService.getMyPending(),
  });

  const allApprovals = allData?.data ?? [];
  const pendingApprovals = pendingData ?? [];

  const displayed = activeTab === 'all'
    ? allApprovals.filter(a =>
        search === '' ||
        a.document.title.toLowerCase().includes(search.toLowerCase()) ||
        a.document.code.toLowerCase().includes(search.toLowerCase())
      )
    : pendingApprovals;

  const isLoading = activeTab === 'all' ? loadingAll : loadingPending;

  const stats = {
    inProgress: allApprovals.filter(a => a.status === 'in_progress').length,
    approved: allApprovals.filter(a => a.status === 'approved').length,
    rejected: allApprovals.filter(a => a.status === 'rejected').length,
    myPending: pendingApprovals.length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Aprovações</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie solicitações de aprovação de documentos</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Em Andamento', value: stats.inProgress, icon: Clock, color: 'text-yellow-500' },
          { label: 'Aprovados', value: stats.approved, icon: CheckCircle2, color: 'text-green-500' },
          { label: 'Rejeitados', value: stats.rejected, icon: XCircle, color: 'text-red-500' },
          { label: 'Aguardando minha ação', value: stats.myPending, icon: AlertCircle, color: 'text-blue-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex rounded-lg border p-1 gap-1">
          {(['all', 'my-pending'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'all' ? 'Todas' : (
                <span className="flex items-center gap-1.5">
                  Aguardando minha ação
                  {stats.myPending > 0 && (
                    <span className="bg-destructive text-destructive-foreground rounded-full text-xs px-1.5 py-0.5 leading-none">
                      {stats.myPending}
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'all' && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou código..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="mb-1 text-lg font-semibold">
            {activeTab === 'my-pending' ? 'Nenhuma aprovação pendente' : 'Nenhuma aprovação encontrada'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {activeTab === 'my-pending'
              ? 'Você está em dia! Não há documentos aguardando sua aprovação.'
              : 'Não foram encontradas aprovações com os filtros informados.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(approval => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onClick={() => navigate(`/approvals/${approval.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
