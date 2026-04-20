import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Users, X, Send } from 'lucide-react';
import { distributionsService } from '@/services/distributions.service';
import { usersService } from '@/services/users.service';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { User } from '@/types';

const schema = z.object({
  copyType: z.enum(['controlled', 'uncontrolled']),
  dueDate: z.string().optional(),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

interface DistributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentCode: string;
  documentTitle: string;
}

export function DistributeModal({ open, onOpenChange, documentId, documentCode, documentTitle }: DistributeModalProps) {
  const qc = useQueryClient();
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');

  const { data: usersData } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => usersService.findAll({ limit: 200 }),
  });

  const allUsers = usersData?.data ?? [];
  const filteredUsers = allUsers.filter(u =>
    !selectedUsers.find(s => s.id === u.id) &&
    (userSearch === '' ||
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { copyType: 'controlled' },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      distributionsService.distribute(documentId, {
        userIds: selectedUsers.map(u => u.id),
        copyType: values.copyType,
        dueDate: values.dueDate || undefined,
        notes: values.notes || undefined,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['distributions'] });
      toast.success(`Documento distribuído para ${data.length} destinatário(s)`);
      onOpenChange(false);
      setSelectedUsers([]);
      form.reset();
    },
    onError: () => toast.error('Erro ao distribuir documento'),
  });

  const addUser = (user: User) => {
    setSelectedUsers(prev => [...prev, user]);
    setUserSearch('');
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Distribuir Documento
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {documentCode} — {documentTitle}
          </p>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(v => mutation.mutate(v))} className="space-y-4">
          {/* User selection */}
          <div className="space-y-2">
            <Label>Destinatários *</Label>
            <Input
              placeholder="Buscar usuário por nome ou e-mail..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
            />
            {userSearch && filteredUsers.length > 0 && (
              <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                {filteredUsers.slice(0, 8).map(u => (
                  <button
                    key={u.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                    onClick={() => addUser(u)}
                  >
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </button>
                ))}
              </div>
            )}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/30">
                {selectedUsers.map(u => (
                  <Badge key={u.id} variant="secondary" className="flex items-center gap-1 pr-1">
                    {u.name}
                    <button type="button" onClick={() => removeUser(u.id)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {selectedUsers.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum destinatário selecionado</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de Cópia</Label>
            <Controller
              control={form.control}
              name="copyType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="controlled">Cópia Controlada (numerada, com marca d'água)</SelectItem>
                    <SelectItem value="uncontrolled">Cópia Não Controlada (informativa)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dueDate">Prazo para leitura</Label>
            <Input id="dueDate" type="date" {...form.register('dueDate')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" {...form.register('notes')} rows={2} placeholder="Instrução adicional para os destinatários..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              type="submit"
              loading={mutation.isPending}
              disabled={selectedUsers.length === 0}
            >
              <Send className="h-4 w-4 mr-2" />
              Distribuir
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
