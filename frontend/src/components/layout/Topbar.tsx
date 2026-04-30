import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import { Moon, Sun, LogOut, User, Bell, BellDot, AlertTriangle, Info, AlertCircle, CheckCheck, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import { alertsService } from '@/services/alerts.service';
import { toast } from 'sonner';
import type { AlertNotification, AlertSeverity } from '@/types';
import { cn } from '@/lib/utils';

const SEVERITY_CONFIG: Record<AlertSeverity, { icon: React.ElementType; color: string }> = {
  info:     { icon: Info,          color: 'text-blue-500' },
  warning:  { icon: AlertTriangle, color: 'text-yellow-500' },
  critical: { icon: AlertCircle,   color: 'text-red-500' },
};

function NotificationPanel({
  alerts,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
  onClose,
  navigate,
}: {
  alerts: AlertNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigate: (alert: AlertNotification) => void;
  onClose: () => void;
  navigate: NavigateFunction;
}) {
  const unread = alerts.filter(a => !a.isRead);

  return (
    <div className="absolute right-0 top-12 w-80 rounded-xl border bg-card shadow-xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-sm">Notificações</h3>
        {unread.length > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onMarkAllRead}>
            <CheckCheck className="h-3.5 w-3.5 mr-1" />Marcar todas como lidas
          </Button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto divide-y">
        {alerts.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            Nenhuma notificação
          </div>
        ) : (
          alerts.map(alert => {
            const cfg = SEVERITY_CONFIG[alert.severity];
            const Icon = cfg.icon;
            return (
              <div
                key={alert.id}
                className={cn(
                  'px-4 py-3 hover:bg-accent transition-colors cursor-pointer flex gap-3',
                  !alert.isRead && 'bg-primary/5',
                )}
                onClick={() => {
                  if (!alert.isRead) onMarkRead(alert.id);
                  if (alert.resourceId && alert.resourceType) onNavigate(alert);
                  onClose();
                }}
              >
                <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', cfg.color)} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium leading-snug', !alert.isRead && 'font-semibold')}>
                    {alert.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{alert.message}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {format(new Date(alert.createdAt), 'dd/MM HH:mm', { locale: ptBR })}
                  </p>
                </div>
                {!alert.isRead && (
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                )}
              </div>
            );
          })
        )}
      </div>

      {alerts.length > 0 && (
        <div className="border-t px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => { navigate('/audit'); onClose(); }}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1" />Ver auditoria completa
          </Button>
        </div>
      )}
    </div>
  );
}

interface TopbarProps {
  title?: string;
}

export function Topbar({ title }: TopbarProps) {
  const { darkMode, toggleDarkMode } = useUiStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [notifOpen, setNotifOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', 'mine'],
    queryFn: () => alertsService.findMine(),
    refetchInterval: 60_000,
  });

  const unreadCount = alerts.filter(a => !a.isRead).length;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => alertsService.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => alertsService.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  const handleLogout = async () => {
    try { await authService.logout(); } finally {
      logout();
      toast.success('Sessão encerrada');
      navigate('/login');
    }
  };

  const handleNavigateAlert = (alert: AlertNotification) => {
    if (alert.resourceType === 'document') navigate(`/documents/${alert.resourceId}`);
    else if (alert.resourceType === 'distribution') navigate('/my-readings');
    else if (alert.resourceType === 'approval') navigate(`/approvals/${alert.resourceId}`);
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <div className="relative" ref={panelRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setNotifOpen(o => !o)}
            className="relative"
            title="Notificações"
          >
            {unreadCount > 0 ? (
              <>
                <BellDot className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-0.5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </>
            ) : (
              <Bell className="h-4 w-4" />
            )}
          </Button>

          {notifOpen && (
            <NotificationPanel
              alerts={alerts}
              onMarkRead={id => markReadMutation.mutate(id)}
              onMarkAllRead={() => markAllReadMutation.mutate()}
              onNavigate={handleNavigateAlert}
              onClose={() => setNotifOpen(false)}
              navigate={navigate}
            />
          )}
        </div>

        <Button variant="ghost" size="icon" onClick={toggleDarkMode} title={darkMode ? 'Modo claro' : 'Modo escuro'}>
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <div className="flex items-center gap-2 text-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden sm:block">
            <p className="font-medium leading-none">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
