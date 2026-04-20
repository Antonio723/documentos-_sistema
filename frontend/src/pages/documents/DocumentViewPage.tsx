import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, GitBranch, Download, Tag, Upload, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FileUpload } from '@/components/shared/FileUpload';
import { documentsService } from '@/services/documents.service';
import { DistributeModal } from '@/pages/distributions/DistributeModal';
import type { DocumentStatus } from '@/types';

const NEXT_STATUS: Record<DocumentStatus, { value: DocumentStatus; label: string }[]> = {
  draft:     [{ value: 'review', label: 'Enviar para Revisão' }, { value: 'cancelled', label: 'Cancelar' }],
  review:    [{ value: 'approval', label: 'Enviar para Aprovação' }, { value: 'draft', label: 'Devolver para Rascunho' }],
  approval:  [{ value: 'published', label: 'Publicar' }, { value: 'review', label: 'Devolver para Revisão' }],
  published: [{ value: 'obsolete', label: 'Marcar como Obsoleto' }],
  obsolete:  [],
  cancelled: [],
};

const CONFIDENTIALITY_LABELS: Record<string, string> = {
  public_internal: 'Público Interno', restricted: 'Restrito', confidential: 'Confidencial', critical: 'Crítico',
};

export function DocumentViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [statusComment, setStatusComment] = useState('');
  const [statusDialog, setStatusDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<DocumentStatus | ''>('');
  const [uploadDialog, setUploadDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [distributeOpen, setDistributeOpen] = useState(false);

  const { data: doc, isLoading } = useQuery({ queryKey: ['document', id], queryFn: () => documentsService.findById(id!) });

  const statusMutation = useMutation({
    mutationFn: () => documentsService.changeStatus(id!, selectedStatus as DocumentStatus, statusComment || undefined),
    onSuccess: () => {
      toast.success('Status atualizado!');
      qc.invalidateQueries({ queryKey: ['document', id] });
      qc.invalidateQueries({ queryKey: ['documents'] });
      setStatusDialog(false);
      setStatusComment('');
    },
    onError: () => toast.error('Erro ao alterar status'),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => documentsService.uploadFile(id!, file),
    onSuccess: () => {
      toast.success('Arquivo enviado!');
      qc.invalidateQueries({ queryKey: ['document', id] });
      setUploadDialog(false);
      setPendingFile(null);
    },
    onError: () => toast.error('Erro no upload'),
  });

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const { url } = await documentsService.getFileUrl(id!, fileId);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
    } catch {
      toast.error('Erro ao obter URL de download');
    }
  };

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>;
  if (!doc) return <p>Documento não encontrado.</p>;

  const nextStatuses = NEXT_STATUS[doc.status];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{doc.title}</h2>
              <StatusBadge status={doc.status} />
            </div>
            <p className="text-sm text-muted-foreground font-mono">{doc.code} · {doc.currentVersion}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {nextStatuses.length > 0 && (
            <Button variant="outline" onClick={() => setStatusDialog(true)}>Alterar Status</Button>
          )}
          {doc.status === 'published' && (
            <Button variant="outline" onClick={() => setDistributeOpen(true)}>
              <Send className="h-4 w-4" /> Distribuir
            </Button>
          )}
          <Button variant="outline" onClick={() => setUploadDialog(true)}>
            <Upload className="h-4 w-4" /> Upload
          </Button>
          <Button variant="outline" onClick={() => navigate(`/documents/${id}/edit`)}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
          <Button variant="outline" onClick={() => navigate(`/documents/${id}/versions`)}>
            <GitBranch className="h-4 w-4" /> Versões
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Detalhes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {doc.description && <p className="text-sm">{doc.description}</p>}
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium">{doc.documentType.name}</span></div>
                <div><span className="text-muted-foreground">Área:</span> <span className="font-medium">{doc.area ?? '—'}</span></div>
                <div><span className="text-muted-foreground">Processo:</span> <span className="font-medium">{doc.process ?? '—'}</span></div>
                <div><span className="text-muted-foreground">Produto:</span> <span className="font-medium">{doc.product ?? '—'}</span></div>
                <div><span className="text-muted-foreground">Responsável:</span> <span className="font-medium">{doc.owner.name}</span></div>
                <div><span className="text-muted-foreground">Confidencialidade:</span> <span className="font-medium">{CONFIDENTIALITY_LABELS[doc.confidentiality]}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Arquivos ({doc.fileObjects.length})</CardTitle></CardHeader>
            <CardContent>
              {doc.fileObjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum arquivo anexado.</p>
              ) : (
                <div className="space-y-2">
                  {doc.fileObjects.map((file) => (
                    <div key={file.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">{file.originalName}</p>
                        <p className="text-xs text-muted-foreground">{(Number(file.sizeBytes) / 1024 / 1024).toFixed(2)} MB · {format(new Date(file.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDownload(file.id, file.originalName)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Vigência</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <div><span className="text-muted-foreground">Início: </span>{doc.validityStart ? format(new Date(doc.validityStart), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</div>
              <div><span className="text-muted-foreground">Fim: </span>{doc.validityEnd ? format(new Date(doc.validityEnd), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</div>
            </CardContent>
          </Card>

          {doc.tags.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Tag className="h-4 w-4" /> Tags</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {doc.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Histórico Recente</CardTitle></CardHeader>
            <CardContent>
              {(doc as unknown as { statusHistory?: { id: string; toStatus: string; comment?: string; user: { name: string }; createdAt: string }[] }).statusHistory?.slice(0, 5).map((h) => (
                <div key={h.id} className="mb-3 text-xs">
                  <p className="font-medium">{h.toStatus.toUpperCase()}</p>
                  {h.comment && <p className="text-muted-foreground truncate">{h.comment}</p>}
                  <p className="text-muted-foreground">{h.user.name} · {format(new Date(h.createdAt), 'dd/MM HH:mm', { locale: ptBR })}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Dialog */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Alterar Status</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Novo Status</Label>
              <Select onValueChange={(v) => setSelectedStatus(v as DocumentStatus)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {nextStatuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Comentário (opcional)</Label>
              <Textarea value={statusComment} onChange={(e) => setStatusComment(e.target.value)} placeholder="Motivo da alteração..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(false)}>Cancelar</Button>
            <Button onClick={() => statusMutation.mutate()} loading={statusMutation.isPending} disabled={!selectedStatus}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Enviar Arquivo</DialogTitle></DialogHeader>
          <FileUpload onFileSelect={setPendingFile} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialog(false)}>Cancelar</Button>
            <Button onClick={() => pendingFile && uploadMutation.mutate(pendingFile)} loading={uploadMutation.isPending} disabled={!pendingFile}>Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Distribute Modal */}
      <DistributeModal
        open={distributeOpen}
        onOpenChange={setDistributeOpen}
        documentId={id!}
        documentCode={doc.code}
        documentTitle={doc.title}
      />
    </div>
  );
}
