import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookOpen, CheckCircle2, Clock, AlertCircle, Download, Eye, FileText } from 'lucide-react';
import { distributionsService } from '@/services/distributions.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { DocumentDistribution } from '@/types';

type Tab = 'pending' | 'confirmed' | 'all';

function DistributionCard({
  dist,
  onConfirm,
  confirming,
}: {
  dist: DocumentDistribution;
  onConfirm: (id: string) => void;
  confirming: boolean;
}) {
  const navigate = useNavigate();
  const isConfirmed = !!dist.confirmation;
  const isOverdue = dist.dueDate && !isConfirmed && new Date(dist.dueDate) < new Date();

  return (
    <Card className={isOverdue ? 'border-destructive/50' : ''}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono text-muted-foreground">{dist.document.code}</span>
              <Badge variant={dist.copyType === 'controlled' ? 'info' : 'muted'} className="text-xs">
                {dist.copyType === 'controlled'
                  ? `Cópia Controlada Nº ${dist.copyNumber ?? '?'}`
                  : 'Cópia Não Controlada'}
              </Badge>
              {isConfirmed ? (
                <Badge variant="success" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />Lido
                </Badge>
              ) : isOverdue ? (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />Atrasado
                </Badge>
              ) : (
                <Badge variant="warning" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />Pendente
                </Badge>
              )}
            </div>
            <p className="font-medium text-sm truncate">{dist.document.title}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
              <span>Versão {dist.version}</span>
              <span>Enviado por {dist.sentBy.name}</span>
              {dist.dueDate && (
                <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                  Prazo: {new Date(dist.dueDate).toLocaleDateString('pt-BR')}
                </span>
              )}
              {isConfirmed && (
                <span className="text-green-600">
                  Confirmado em {new Date(dist.confirmation!.confirmedAt).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
            {dist.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{dist.notes}"</p>}
          </div>

          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Ver documento"
              onClick={() => navigate(`/documents/${dist.documentId}`)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Baixar com marca d'água"
              onClick={() => {
                const url = `/api${distributionsService.getDownloadUrl(dist.id)}`;
                window.open(url, '_blank');
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
            {!isConfirmed && (
              <Button
                size="sm"
                className="h-8"
                onClick={() => onConfirm(dist.id)}
                loading={confirming}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Confirmar leitura
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MyReadingsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['distributions', 'mine', activeTab],
    queryFn: () => distributionsService.findMine({ status: activeTab }),
  });

  const { data: pendingData } = useQuery({
    queryKey: ['distributions', 'my-pending'],
    queryFn: () => distributionsService.findMyPending(),
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => distributionsService.confirm(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['distributions'] });
      toast.success('Leitura confirmada com sucesso');
      setConfirmTarget(null);
    },
    onError: () => toast.error('Erro ao confirmar leitura'),
  });

  const items = data?.data ?? [];
  const pendingCount = pendingData?.length ?? 0;

  const stats = {
    pending: pendingCount,
    confirmed: (data?.meta.total ?? 0) - pendingCount,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meus Documentos para Leitura</h1>
        <p className="text-muted-foreground text-sm mt-1">Documentos distribuídos para você confirmar leitura</p>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">Confirmados</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{stats.confirmed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total</CardTitle>
              <BookOpen className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{data?.meta.total ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex rounded-lg border p-1 gap-1 w-fit">
        {(['pending', 'confirmed', 'all'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'pending' ? (
              <span className="flex items-center gap-1.5">
                Pendentes
                {pendingCount > 0 && (
                  <span className="bg-destructive text-destructive-foreground rounded-full text-xs px-1.5 py-0.5 leading-none">
                    {pendingCount}
                  </span>
                )}
              </span>
            ) : tab === 'confirmed' ? 'Confirmados' : 'Todos'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="mb-1 text-lg font-semibold">Nenhum documento encontrado</h3>
          <p className="text-sm text-muted-foreground">
            {activeTab === 'pending'
              ? 'Você está em dia! Nenhum documento pendente de leitura.'
              : 'Nenhum documento nesta categoria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(dist => (
            <DistributionCard
              key={dist.id}
              dist={dist}
              onConfirm={setConfirmTarget}
              confirming={confirmMutation.isPending && confirmTarget === dist.id}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={o => !o && setConfirmTarget(null)}
        title="Confirmar Leitura"
        description="Ao confirmar, você declara que leu e compreendeu o conteúdo deste documento. Esta ação gera um registro de auditoria com assinatura eletrônica."
        confirmLabel="Confirmar Leitura"
        onConfirm={() => confirmTarget && confirmMutation.mutate(confirmTarget)}
        loading={confirmMutation.isPending}
        variant="default"
      />
    </div>
  );
}
