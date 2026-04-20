import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, GitBranch, Clock, User, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { documentsService } from '@/services/documents.service';
import type { DocumentStatus } from '@/types';

const STATUS_COLORS: Record<DocumentStatus, string> = {
  draft:     'bg-slate-400',
  review:    'bg-blue-400',
  approval:  'bg-yellow-400',
  published: 'bg-green-500',
  obsolete:  'bg-gray-400',
  cancelled: 'bg-red-400',
};

export function DocumentVersionsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [newVersionDialog, setNewVersionDialog] = useState(false);
  const [reason, setReason] = useState('');

  const { data: doc } = useQuery({ queryKey: ['document', id], queryFn: () => documentsService.findById(id!) });
  const { data: versions, isLoading: loadingVersions } = useQuery({ queryKey: ['versions', id], queryFn: () => documentsService.getVersions(id!) });
  const { data: history, isLoading: loadingHistory } = useQuery({ queryKey: ['history', id], queryFn: () => documentsService.getHistory(id!) });

  const newVersionMutation = useMutation({
    mutationFn: () => documentsService.createNewVersion(id!, reason),
    onSuccess: () => {
      toast.success('Nova revisão criada! O documento voltou para Rascunho.');
      qc.invalidateQueries({ queryKey: ['versions', id] });
      qc.invalidateQueries({ queryKey: ['history', id] });
      qc.invalidateQueries({ queryKey: ['document', id] });
      setNewVersionDialog(false);
      setReason('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Erro ao criar nova revisão');
    },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h2 className="text-2xl font-bold">Histórico de Versões</h2>
            <p className="text-sm text-muted-foreground font-mono">{doc?.code} · {doc?.title}</p>
          </div>
        </div>
        {doc?.status === 'published' && (
          <Button onClick={() => setNewVersionDialog(true)}>
            <Plus className="h-4 w-4" /> Nova Revisão
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Versions */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><GitBranch className="h-4 w-4" /> Revisões</CardTitle></CardHeader>
          <CardContent>
            {loadingVersions ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
            ) : !versions?.length ? (
              <p className="text-sm text-muted-foreground">Nenhuma revisão registrada.</p>
            ) : (
              <div className="relative space-y-0">
                {versions.map((v, idx) => (
                  <div key={v.id} className="flex gap-4">
                    {/* Timeline indicator */}
                    <div className="flex flex-col items-center">
                      <div className={`mt-1 h-3 w-3 rounded-full border-2 border-white ${STATUS_COLORS[v.status]} shadow`} />
                      {idx < versions.length - 1 && <div className="w-0.5 flex-1 bg-border my-1" />}
                    </div>
                    {/* Content */}
                    <div className="pb-6 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-sm">{v.versionCode}</span>
                        <StatusBadge status={v.status} />
                        {idx === 0 && <Badge variant="default" className="text-xs">Atual</Badge>}
                      </div>
                      <p className="text-sm">{v.reason}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <User className="h-3 w-3" /> {v.createdBy.name} ·
                        <Clock className="h-3 w-3" /> {format(new Date(v.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </p>
                      {v.fileObjects.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <FileText className="h-3 w-3" /> {v.fileObjects.length} arquivo(s)
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status History */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" /> Histórico de Status</CardTitle></CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : !history?.length ? (
              <p className="text-sm text-muted-foreground">Nenhum histórico registrado.</p>
            ) : (
              <div className="relative space-y-0">
                {history.map((h, idx) => (
                  <div key={h.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`mt-1 h-3 w-3 rounded-full border-2 border-white ${STATUS_COLORS[h.toStatus]} shadow`} />
                      {idx < history.length - 1 && <div className="w-0.5 flex-1 bg-border my-1" />}
                    </div>
                    <div className="pb-4 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {h.fromStatus && (
                          <>
                            <StatusBadge status={h.fromStatus} />
                            <span className="text-muted-foreground text-xs">→</span>
                          </>
                        )}
                        <StatusBadge status={h.toStatus} />
                      </div>
                      {h.comment && <p className="text-sm mt-1">{h.comment}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {h.user.name} · {format(new Date(h.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Version Dialog */}
      <Dialog open={newVersionDialog} onOpenChange={setNewVersionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Nova Revisão</DialogTitle>
            <DialogDescription>
              O documento retornará para Rascunho com a versão seguinte. A versão publicada atual será marcada como Obsoleta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Versão atual</span>
                <span className="font-mono font-medium">{doc?.currentVersion}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nova versão</span>
                <span className="font-mono font-medium text-primary">
                  {doc?.currentVersion ? `Rev.${String(parseInt(doc.currentVersion.replace('Rev.', '')) + 1).padStart(2, '0')}` : '—'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo da Revisão *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Descreva o motivo desta nova revisão (mínimo 10 caracteres)..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">{reason.length}/1000 caracteres (mínimo 10)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewVersionDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => newVersionMutation.mutate()}
              loading={newVersionMutation.isPending}
              disabled={reason.trim().length < 10}
            >
              Criar Nova Revisão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
