import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileUpload } from '@/components/shared/FileUpload';
import { documentsService } from '@/services/documents.service';
import { documentTypesService } from '@/services/document-types.service';
import { useState } from 'react';

const schema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres'),
  description: z.string().optional(),
  documentTypeId: z.string().uuid('Selecione um tipo'),
  area: z.string().optional(),
  process: z.string().optional(),
  product: z.string().optional(),
  confidentiality: z.enum(['public_internal', 'restricted', 'confidential', 'critical']),
  validityStart: z.string().optional(),
  validityEnd: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const CONFIDENTIALITY_LABELS = {
  public_internal: 'Público Interno',
  restricted: 'Restrito',
  confidential: 'Confidencial',
  critical: 'Crítico',
};

export function DocumentCreatePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const { data: types } = useQuery({
    queryKey: ['document-types', 'active'],
    queryFn: documentTypesService.findAllActive,
  });

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { confidentiality: 'public_internal' },
  });

  const mutation = useMutation({
    mutationFn: async (dto: FormData) => {
      const doc = await documentsService.create(dto);
      if (pendingFile) {
        await documentsService.uploadFile(doc.id, pendingFile).catch(() =>
          toast.warning('Documento criado, mas o upload do arquivo falhou.'),
        );
      }
      return doc;
    },
    onSuccess: (doc) => {
      toast.success('Documento criado com sucesso!');
      qc.invalidateQueries({ queryKey: ['documents'] });
      navigate(`/documents/${doc.id}`);
    },
    onError: () => toast.error('Erro ao criar documento'),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Novo Documento</h2>
          <p className="text-sm text-muted-foreground">Preencha as informações do documento</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Informações Principais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input id="title" {...register('title')} placeholder="Ex: Procedimento Operacional Padrão de..." />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentTypeId">Tipo de Documento *</Label>
              <Select onValueChange={(v) => setValue('documentTypeId', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  {types?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.documentTypeId && <p className="text-xs text-destructive">{errors.documentTypeId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" {...register('description')} placeholder="Descreva o objetivo e escopo do documento..." rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Confidencialidade</Label>
              <Select defaultValue="public_internal" onValueChange={(v) => setValue('confidentiality', v as FormData['confidentiality'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CONFIDENTIALITY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Classificação</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Área</Label>
              <Input {...register('area')} placeholder="Ex: Qualidade" />
            </div>
            <div className="space-y-2">
              <Label>Processo</Label>
              <Input {...register('process')} placeholder="Ex: Fabricação" />
            </div>
            <div className="space-y-2">
              <Label>Produto</Label>
              <Input {...register('product')} placeholder="Ex: Produto A" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Vigência</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Início de Vigência</Label>
              <Input type="date" {...register('validityStart')} />
            </div>
            <div className="space-y-2">
              <Label>Fim de Vigência</Label>
              <Input type="date" {...register('validityEnd')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Arquivo (opcional)</CardTitle></CardHeader>
          <CardContent>
            <FileUpload onFileSelect={setPendingFile} />
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" loading={mutation.isPending}>
            <Save className="h-4 w-4" /> Criar Documento
          </Button>
        </div>
      </form>
    </div>
  );
}
