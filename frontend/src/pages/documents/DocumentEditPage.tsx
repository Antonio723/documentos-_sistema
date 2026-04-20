import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { documentsService } from '@/services/documents.service';

const schema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  area: z.string().optional(),
  process: z.string().optional(),
  product: z.string().optional(),
  confidentiality: z.enum(['public_internal', 'restricted', 'confidential', 'critical']),
  validityStart: z.string().optional(),
  validityEnd: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const CONFIDENTIALITY_LABELS = { public_internal: 'Público Interno', restricted: 'Restrito', confidential: 'Confidencial', critical: 'Crítico' };

export function DocumentEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: doc, isLoading } = useQuery({ queryKey: ['document', id], queryFn: () => documentsService.findById(id!) });
  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (doc) {
      reset({
        title: doc.title,
        description: doc.description ?? '',
        area: doc.area ?? '',
        process: doc.process ?? '',
        product: doc.product ?? '',
        confidentiality: doc.confidentiality,
        validityStart: doc.validityStart ? doc.validityStart.slice(0, 10) : '',
        validityEnd: doc.validityEnd ? doc.validityEnd.slice(0, 10) : '',
      });
    }
  }, [doc, reset]);

  const mutation = useMutation({
    mutationFn: (dto: FormData) => documentsService.update(id!, dto),
    onSuccess: () => {
      toast.success('Documento atualizado!');
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['document', id] });
      navigate(`/documents/${id}`);
    },
    onError: () => toast.error('Erro ao atualizar documento'),
  });

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h2 className="text-2xl font-bold">Editar Documento</h2>
          <p className="text-sm text-muted-foreground font-mono">{doc?.code} · {doc?.currentVersion}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Informações Principais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Documento</Label>
              <Input value={doc?.documentType.name ?? ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input {...register('title')} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea {...register('description')} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Confidencialidade</Label>
              <Select defaultValue={doc?.confidentiality} onValueChange={(v) => setValue('confidentiality', v as FormData['confidentiality'])}>
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
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Área</Label><Input {...register('area')} /></div>
            <div className="space-y-2"><Label>Processo</Label><Input {...register('process')} /></div>
            <div className="space-y-2"><Label>Produto</Label><Input {...register('product')} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Vigência</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Início</Label><Input type="date" {...register('validityStart')} /></div>
            <div className="space-y-2"><Label>Fim</Label><Input type="date" {...register('validityEnd')} /></div>
          </CardContent>
        </Card>

        <Separator />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" loading={mutation.isPending}><Save className="h-4 w-4" /> Salvar Alterações</Button>
        </div>
      </form>
    </div>
  );
}
