import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { workflowsService } from '@/services/workflows.service';
import { documentTypesService } from '@/services/document-types.service';
import { usersService, rolesService } from '@/services/users.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const stepSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
  approverType: z.enum(['user', 'role']),
  approverUserId: z.string().optional(),
  approverRoleId: z.string().optional(),
  slaHours: z.coerce.number().min(1).optional(),
  isRequired: z.boolean().default(true),
}).refine(d => {
  if (d.approverType === 'user') return !!d.approverUserId;
  return !!d.approverRoleId;
}, { message: 'Selecione um aprovador', path: ['approverUserId'] });

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
  documentTypeId: z.string().optional(),
  isActive: z.boolean().default(true),
  steps: z.array(stepSchema).min(1, 'Adicione ao menos uma etapa'),
});

type FormValues = z.infer<typeof schema>;

export function WorkflowFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [stepApproverTypes, setStepApproverTypes] = useState<Record<number, 'user' | 'role'>>({});

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['workflow', id],
    queryFn: () => workflowsService.findById(id!),
    enabled: isEditing,
  });

  const { data: docTypes } = useQuery({
    queryKey: ['document-types', 'active'],
    queryFn: () => documentTypesService.findAllActive(),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => usersService.findAll({ limit: 200 }),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles', 'all'],
    queryFn: () => rolesService.findAll({ limit: 100 }),
  });

  const users = usersData?.data ?? [];
  const roles = rolesData?.data ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      isActive: true,
      steps: [{ name: '', approverType: 'user', isRequired: true }],
    },
  });

  const { fields, append, remove, swap } = useFieldArray({ control: form.control, name: 'steps' });

  useEffect(() => {
    if (existing) {
      const types: Record<number, 'user' | 'role'> = {};
      existing.steps.forEach((s, i) => {
        types[i] = s.approverUserId ? 'user' : 'role';
      });
      setStepApproverTypes(types);
      form.reset({
        name: existing.name,
        description: existing.description ?? '',
        documentTypeId: existing.documentTypeId ?? undefined,
        isActive: existing.isActive,
        steps: existing.steps.map(s => ({
          name: s.name,
          description: s.description ?? '',
          approverType: s.approverUserId ? 'user' : 'role',
          approverUserId: s.approverUserId ?? undefined,
          approverRoleId: s.approverRoleId ?? undefined,
          slaHours: s.slaHours ?? undefined,
          isRequired: s.isRequired,
        })),
      });
    }
  }, [existing, form]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        ...values,
        documentTypeId: values.documentTypeId || undefined,
        steps: values.steps.map((s, i) => ({
          order: i + 1,
          name: s.name,
          description: s.description || undefined,
          approverUserId: s.approverType === 'user' ? s.approverUserId : undefined,
          approverRoleId: s.approverType === 'role' ? s.approverRoleId : undefined,
          slaHours: s.slaHours || undefined,
          isRequired: s.isRequired,
        })),
      };
      return isEditing ? workflowsService.update(id!, payload) : workflowsService.create(payload);
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Workflow atualizado' : 'Workflow criado');
      navigate('/workflows');
    },
    onError: () => toast.error('Erro ao salvar workflow'),
  });

  if (isEditing && loadingExisting) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/workflows')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isEditing ? 'Editar Workflow' : 'Novo Workflow'}</h1>
          <p className="text-muted-foreground text-sm">Template de fluxo de aprovação de documentos</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Informações Gerais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" {...form.register('name')} placeholder="Ex: Aprovação de POPs" />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="documentTypeId">Tipo de Documento</Label>
                <Select
                  value={form.watch('documentTypeId') ?? ''}
                  onValueChange={(v) => form.setValue('documentTypeId', v === '__none__' ? undefined : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Qualquer tipo (genérico)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Qualquer tipo (genérico)</SelectItem>
                    {(docTypes ?? []).map(dt => (
                      <SelectItem key={dt.id} value={dt.id}>{dt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" {...form.register('description')} rows={2} placeholder="Descreva o propósito deste workflow" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                className="h-4 w-4 rounded border-input accent-primary"
                {...form.register('isActive')}
              />
              <Label htmlFor="isActive" className="cursor-pointer">Workflow ativo</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Etapas de Aprovação</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                append({ name: '', approverType: 'user', isRequired: true });
                setStepApproverTypes(prev => ({ ...prev, [fields.length]: 'user' }));
              }}
            >
              <Plus className="h-3 w-3 mr-1" />Adicionar Etapa
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.formState.errors.steps?.root && (
              <p className="text-sm text-destructive">{form.formState.errors.steps.root.message}</p>
            )}
            {form.formState.errors.steps?.message && (
              <p className="text-sm text-destructive">{form.formState.errors.steps.message}</p>
            )}

            {fields.map((field, index) => {
              const approverType = stepApproverTypes[index] ?? 'user';
              const stepErrors = form.formState.errors.steps?.[index];

              return (
                <div key={field.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      Etapa {index + 1}
                    </span>
                    <div className="ml-auto flex gap-1">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => swap(index, index - 1)}>
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={index === fields.length - 1} onClick={() => swap(index, index + 1)}>
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => remove(index)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Nome da Etapa *</Label>
                      <Input {...form.register(`steps.${index}.name`)} placeholder="Ex: Revisão técnica" />
                      {stepErrors?.name && <p className="text-xs text-destructive">{stepErrors.name.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>SLA (horas)</Label>
                      <Input type="number" min={1} {...form.register(`steps.${index}.slaHours`)} placeholder="Ex: 48" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Tipo de Aprovador</Label>
                    <Select
                      value={approverType}
                      onValueChange={(v: 'user' | 'role') => {
                        setStepApproverTypes(prev => ({ ...prev, [index]: v }));
                        form.setValue(`steps.${index}.approverType`, v);
                        form.setValue(`steps.${index}.approverUserId`, undefined);
                        form.setValue(`steps.${index}.approverRoleId`, undefined);
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário específico</SelectItem>
                        <SelectItem value="role">Papel (role)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {approverType === 'user' ? (
                    <div className="space-y-1.5">
                      <Label>Aprovador *</Label>
                      <Select
                        value={form.watch(`steps.${index}.approverUserId`) ?? ''}
                        onValueChange={(v) => form.setValue(`steps.${index}.approverUserId`, v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione o usuário" /></SelectTrigger>
                        <SelectContent>
                          {users.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {stepErrors?.approverUserId && <p className="text-xs text-destructive">{stepErrors.approverUserId.message}</p>}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label>Papel aprovador *</Label>
                      <Select
                        value={form.watch(`steps.${index}.approverRoleId`) ?? ''}
                        onValueChange={(v) => form.setValue(`steps.${index}.approverRoleId`, v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione o papel" /></SelectTrigger>
                        <SelectContent>
                          {roles.map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`req-${index}`}
                      className="h-4 w-4 rounded border-input accent-primary"
                      {...form.register(`steps.${index}.isRequired`)}
                    />
                    <Label htmlFor={`req-${index}`} className={cn('cursor-pointer text-sm')}>
                      Etapa obrigatória
                    </Label>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/workflows')}>Cancelar</Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEditing ? 'Salvar Alterações' : 'Criar Workflow'}
          </Button>
        </div>
      </form>
    </div>
  );
}
