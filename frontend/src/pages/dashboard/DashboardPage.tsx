import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  FileText, CheckCircle, AlertTriangle, GraduationCap,
  BookOpen, Bell, TrendingUp, Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { dashboardService } from '@/services/dashboard.service';
import { cn } from '@/lib/utils';

// ─── helpers ────────────────────────────────────────────────────────────────

const DOC_STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho', approval: 'Aprovação', published: 'Publicado',
  obsolete: 'Obsoleto', archived: 'Arquivado',
};

const DOC_STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8', approval: '#f59e0b', published: '#22c55e',
  obsolete: '#ef4444', archived: '#6b7280',
};

const ACTION_LABELS: Record<string, { label: string; variant: 'success' | 'destructive' | 'warning' | 'info' | 'muted' }> = {
  create:  { label: 'Criou',    variant: 'success' },
  update:  { label: 'Editou',   variant: 'info' },
  delete:  { label: 'Excluiu',  variant: 'destructive' },
  approve: { label: 'Aprovou',  variant: 'success' },
  reject:  { label: 'Rejeitou', variant: 'destructive' },
  assign:  { label: 'Atribuiu', variant: 'warning' },
  complete:{ label: 'Concluiu', variant: 'success' },
  read:    { label: 'Leu',      variant: 'muted' },
};

const RESOURCE_LABELS: Record<string, string> = {
  document: 'documento', training: 'treinamento', approval: 'aprovação',
  distribution: 'leitura', user: 'usuário',
};

function monthLabel(ym: string) {
  const [y, m] = ym.split('-');
  return format(new Date(+y, +m - 1), 'MMM/yy', { locale: ptBR });
}

// ─── KPI card ────────────────────────────────────────────────────────────────

function KpiCard({
  title, value, icon: Icon, color, sub, onClick,
}: {
  title: string; value: number | string; icon: React.ElementType;
  color: string; sub?: string; onClick?: () => void;
}) {
  return (
    <Card className={cn(onClick && 'cursor-pointer hover:shadow-md transition-shadow')} onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate();

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: dashboardService.getKpis,
    refetchInterval: 60_000,
  });

  const { data: trend = [], isLoading: trendLoading } = useQuery({
    queryKey: ['dashboard', 'trend'],
    queryFn: dashboardService.getDocumentTrend,
    refetchInterval: 120_000,
  });

  const { data: compliance = [], isLoading: complianceLoading } = useQuery({
    queryKey: ['dashboard', 'compliance'],
    queryFn: dashboardService.getTrainingCompliance,
    refetchInterval: 120_000,
  });

  // Pie data
  const pieData = kpis
    ? Object.entries(kpis.documents.byStatus)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: DOC_STATUS_LABELS[k] ?? k, value: v, color: DOC_STATUS_COLORS[k] ?? '#8884d8' }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground text-sm">Visão geral do sistema de gestão documental</p>
      </div>

      {/* KPI Row 1 */}
      {kpisLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Documentos Publicados"
              value={kpis?.documents.byStatus['published'] ?? 0}
              icon={FileText}
              color="text-green-500"
              sub={`${kpis?.documents.total ?? 0} no total`}
            />
            <KpiCard
              title="Aguardando Aprovação"
              value={kpis?.approvals.pending ?? 0}
              icon={CheckCircle}
              color="text-yellow-500"
              onClick={() => navigate('/approvals')}
            />
            <KpiCard
              title="Vencendo em 30 dias"
              value={kpis?.documents.expiringIn30 ?? 0}
              icon={AlertTriangle}
              color="text-red-500"
              sub={`+${kpis?.documents.expiringIn60 ?? 0} até 60 dias`}
            />
            <KpiCard
              title="Alertas não lidos"
              value={kpis?.alerts.unread ?? 0}
              icon={Bell}
              color="text-purple-500"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Leituras Pendentes"
              value={kpis?.readings.pending ?? 0}
              icon={BookOpen}
              color="text-blue-500"
              sub={`${kpis?.readings.overdue ?? 0} atrasadas`}
              onClick={() => navigate('/my-readings')}
            />
            <KpiCard
              title="Treinamentos Atribuídos"
              value={kpis?.trainings.total ?? 0}
              icon={GraduationCap}
              color="text-indigo-500"
              onClick={() => navigate('/trainings')}
            />
            <KpiCard
              title="Conformidade Geral"
              value={`${kpis?.trainings.complianceRate ?? 0}%`}
              icon={TrendingUp}
              color="text-teal-500"
            />
            <KpiCard
              title="Total de Documentos"
              value={kpis?.documents.total ?? 0}
              icon={Activity}
              color="text-slate-500"
              onClick={() => navigate('/documents')}
            />
          </div>
        </>
      )}

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Document Status Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {kpisLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : pieData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Nenhum documento cadastrado
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} docs`]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Document Trend Line */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução de Documentos (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : trend.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Sem dados suficientes
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trend.map(d => ({ ...d, month: monthLabel(d.month) }))}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="created" name="Criados" stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="published" name="Publicados" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Training Compliance Bar */}
      {!complianceLoading && compliance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conformidade por Treinamento (ativos)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={compliance} layout="vertical" margin={{ left: 8 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 'dataMax']} />
                <YAxis dataKey="title" type="category" width={160} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" name="Concluídos" fill="#22c55e" stackId="a" />
                <Bar dataKey="pending"   name="Pendentes"  fill="#f59e0b" stackId="a" />
                <Bar dataKey="overdue"   name="Atrasados"  fill="#ef4444" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {kpis && kpis.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {kpis.recentActivity.map(item => {
                const act = ACTION_LABELS[item.action] ?? { label: item.action, variant: 'muted' as const };
                const res = RESOURCE_LABELS[item.resource] ?? item.resource;
                return (
                  <div key={item.id} className="flex items-center gap-3 text-sm py-1 border-b last:border-0">
                    <Badge variant={act.variant} className="text-xs shrink-0 w-20 justify-center">{act.label}</Badge>
                    <span className="flex-1 text-muted-foreground">
                      <span className="font-medium text-foreground">{item.user}</span>
                      {' '}{act.label.toLowerCase()} {res}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(item.createdAt), 'dd/MM HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
