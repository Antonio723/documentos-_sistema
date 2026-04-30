import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, FolderOpen, Users, Building2, Shield, ChevronLeft, GitBranch, CheckSquare, BookOpen, ScrollText, GraduationCap, School } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui.store';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/documents', icon: FileText, label: 'Documentos' },
  { to: '/approvals', icon: CheckSquare, label: 'Aprovações' },
  { to: '/my-readings', icon: BookOpen, label: 'Minha Leitura' },
  { to: '/my-trainings', icon: GraduationCap, label: 'Meus Treinamentos' },
  { to: '/trainings', icon: School, label: 'Treinamentos' },
  { to: '/workflows', icon: GitBranch, label: 'Workflows' },
  { to: '/document-types', icon: FolderOpen, label: 'Tipos de Documento' },
  { to: '/users', icon: Users, label: 'Usuários' },
  { to: '/companies', icon: Building2, label: 'Empresas' },
  { to: '/roles', icon: Shield, label: 'Papéis e Permissões' },
  { to: '/audit', icon: ScrollText, label: 'Auditoria' },
];

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUiStore();

  return (
    <aside className={cn(
      'flex flex-col border-r bg-card transition-all duration-300',
      sidebarOpen ? 'w-64' : 'w-16',
    )}>
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {sidebarOpen && (
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">DocManager</span>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className={cn(!sidebarOpen && 'mx-auto')}>
          <ChevronLeft className={cn('h-4 w-4 transition-transform', !sidebarOpen && 'rotate-180')} />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors mb-1',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              !sidebarOpen && 'justify-center px-2',
            )}
            title={!sidebarOpen ? label : undefined}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {sidebarOpen && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
