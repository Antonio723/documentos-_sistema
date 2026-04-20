import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Eye, Pencil, Trash2, GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { documentsService } from '@/services/documents.service';
import type { Document, DocumentStatus } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_OPTIONS: { value: DocumentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os status' },
  { value: 'draft', label: 'Rascunho' },
  { value: 'review', label: 'Em Revisão' },
  { value: 'approval', label: 'Aprovação' },
  { value: 'published', label: 'Publicado' },
  { value: 'obsolete', label: 'Obsoleto' },
  { value: 'cancelled', label: 'Cancelado' },
];

export function DocumentsListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<DocumentStatus | 'all'>('all');
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['documents', page, search, status],
    queryFn: () => documentsService.findAll({
      page,
      limit: 15,
      ...(search && { search }),
      ...(status !== 'all' && { status }),
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsService.delete(id),
    onSuccess: () => {
      toast.success('Documento excluído');
      qc.invalidateQueries({ queryKey: ['documents'] });
      setDeleteTarget(null);
    },
    onError: () => toast.error('Erro ao excluir documento'),
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Documentos</h2>
          <p className="text-sm text-muted-foreground">Gestão de documentos da empresa</p>
        </div>
        <Button onClick={() => navigate('/documents/new')}>
          <Plus className="h-4 w-4" /> Novo Documento
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-1 min-w-48 gap-2">
              <Input
                placeholder="Pesquisar por título, código, área..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v as DocumentStatus | 'all'); setPage(1); }}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-px">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-none first:rounded-t-lg last:rounded-b-lg" />)}
            </div>
          ) : !data?.data.length ? (
            <EmptyState title="Nenhum documento encontrado" description="Crie seu primeiro documento para começar." action={<Button onClick={() => navigate('/documents/new')}><Plus className="h-4 w-4" /> Novo Documento</Button>} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Código</th>
                      <th className="px-4 py-3 text-left font-medium">Título</th>
                      <th className="px-4 py-3 text-left font-medium">Tipo</th>
                      <th className="px-4 py-3 text-left font-medium">Versão</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Validade</th>
                      <th className="px-4 py-3 text-left font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((doc) => (
                      <tr key={doc.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{doc.code}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{doc.title}</p>
                          {doc.area && <p className="text-xs text-muted-foreground">{doc.area}</p>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{doc.documentType.name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{doc.currentVersion}</td>
                        <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {doc.validityEnd ? format(new Date(doc.validityEnd), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/documents/${doc.id}`)} title="Visualizar">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/documents/${doc.id}/edit`)} title="Editar">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/documents/${doc.id}/versions`)} title="Versões">
                              <GitBranch className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(doc)} title="Excluir">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.meta.totalPages > 1 && (
                <Pagination page={page} totalPages={data.meta.totalPages} total={data.meta.total} limit={15} onPageChange={setPage} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Excluir Documento"
        description={`Tem certeza que deseja excluir "${deleteTarget?.title}"? Esta ação não pode ser desfeita.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
