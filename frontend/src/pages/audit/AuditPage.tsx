import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { auditService } from '@/services/audit.service';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { AuditLog } from '@/types';

const ACTION_VARIANT: Record<string, 'success' | 'destructive' | 'warning' | 'info' | 'muted'> = {
  create:        'success',
  login:         'info',
  update:        'warning',
  delete:        'destructive',
  status_change: 'warning',
  approve:       'success',
  reject:        'destructive',
  cancel:        'muted',
  confirm:       'success',
};

const ACTION_LABELS: Record<string, string> = {
  create:        'Criação',
  login:         'Login',
  update:        'Atualização',
  delete:        'Exclusão',
  status_change: 'Mudança de Status',
  approve:       'Aprovação',
  reject:        'Rejeição',
  cancel:        'Cancelamento',
  confirm:       'Confirmação',
};

const RESOURCE_LABELS: Record<string, string> = {
  auth:         'Autenticação',
  document:     'Documento',
  approval:     'Aprovação',
  distribution: 'Distribuição',
  user:         'Usuário',
  role:         'Papel',
  workflow:     'Workflow',
};

function AuditRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const actionVariant = ACTION_VARIANT[log.action] ?? 'muted';
  const hasDetails = log.details && Object.keys(log.details).length > 0;

  return (
    <div
      className="border-b last:border-b-0 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => hasDetails && setExpanded(!expanded)}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-muted-foreground font-mono w-32 shrink-0">
          {format(new Date(log.createdAt), 'dd/MM/yy HH:mm:ss', { locale: ptBR })}
        </span>
        <Badge variant={actionVariant} className="text-xs shrink-0 w-28 justify-center">
          {ACTION_LABELS[log.action] ?? log.action}
        </Badge>
        <Badge variant="outline" className="text-xs shrink-0">
          {RESOURCE_LABELS[log.resource] ?? log.resource}
        </Badge>
        <span className="text-sm flex-1 min-w-0 truncate">
          {log.userName ?? 'Sistema'}
          {log.userEmail && <span className="text-muted-foreground ml-1">({log.userEmail})</span>}
        </span>
        {log.ip && <span className="text-xs text-muted-foreground hidden lg:block">{log.ip}</span>}
      </div>

      {expanded && hasDetails && (
        <div className="mt-2 ml-36 p-2 rounded-md bg-muted/50">
          <pre className="text-xs text-foreground/80 overflow-auto">
            {JSON.stringify(log.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [resource, setResource] = useState('');
  const [action, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const params = {
    page,
    limit: 30,
    ...(search   ? { search }   : {}),
    ...(resource ? { resource } : {}),
    ...(action   ? { action }   : {}),
    ...(dateFrom ? { dateFrom: new Date(dateFrom).toISOString() } : {}),
    ...(dateTo   ? { dateTo: new Date(dateTo + 'T23:59:59').toISOString() } : {}),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['audit', params],
    queryFn: () => auditService.findAll(params),
  });

  const { data: resources } = useQuery({
    queryKey: ['audit-resources'],
    queryFn: () => auditService.getResources(),
  });

  const logs = data?.data ?? [];
  const meta = data?.meta;

  const uniqueActions = Object.keys(ACTION_LABELS);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Log de Auditoria</h1>
          <p className="text-muted-foreground text-sm">Registro completo de todas as ações do sistema</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por usuário, ação..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>

        <Select value={resource || '__all__'} onValueChange={v => { setResource(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Recurso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os recursos</SelectItem>
            {(resources ?? []).map(r => (
              <SelectItem key={r} value={r}>{RESOURCE_LABELS[r] ?? r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={action || '__all__'} onValueChange={v => { setAction(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Ação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas as ações</SelectItem>
            {uniqueActions.map(a => (
              <SelectItem key={a} value={a}>{ACTION_LABELS[a]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="w-36" placeholder="De" />
        <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="w-36" placeholder="Até" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-2 border-b bg-muted/30">
            <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
              <span className="w-32">Data/Hora</span>
              <span className="w-28">Ação</span>
              <span>Recurso</span>
              <span className="flex-1">Usuário</span>
              <span className="hidden lg:block">IP</span>
            </div>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              Nenhum registro encontrado com os filtros informados.
            </div>
          ) : (
            logs.map(log => <AuditRow key={log.id} log={log} />)
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((page - 1) * 30) + 1}–{Math.min(page * 30, meta.total)} de {meta.total} registros
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
