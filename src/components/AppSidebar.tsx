import { IcesiBrand } from '@/components/IcesiBrand';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CircleHelp,
  GitFork,
  GitBranch,
  ChevronUp,
  Link2,
  Table2,
  PanelLeftClose,
  PanelLeftOpen,
  Info,
  ChevronDown,
  FlaskConical,
  BarChart3,
  Settings,
  LogOut,
  Layers,
  ArrowRightToLine,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGraphStore } from '@/store/graphStore';
import { useAuth } from '@/contexts/useAuth';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from './ThemeToggle';
import { navigationFamily } from '@/lib/workContext';

interface SubItem {
  subtype: string;
  label: string;
  demoOp?: string;
}

interface NavItem {
  type: string;
  label: string;
  icon: LucideIcon;
  subItems?: SubItem[];
  /** Demo paso a paso de la familia (HU-19): clave del catálogo `type/subtype/op`. */
  demo?: { subtype: string; op: string; title: string };
}

const NAV_ITEMS: NavItem[] = [
  { type: 'graph', label: 'Grafos', icon: GitFork, demo: { subtype: 'simple', op: 'bfs', title: 'Demo: BFS sobre el grafo del lienzo' } },
  {
    type: 'tree',
    label: 'Árboles',
    icon: GitBranch,
    subItems: [
      { subtype: 'avl', label: 'AVL', demoOp: 'insert' },
      { subtype: 'bst', label: 'Árbol BST', demoOp: 'inorder' },
      { subtype: 'btree', label: 'B-árbol' },
    ],
  },
  { type: 'heap', label: 'Heaps', icon: ChevronUp },
  { type: 'stack', label: 'Pilas', icon: Layers, demo: { subtype: 'simple', op: 'pop', title: 'Demo: pop paso a paso' } },
  { type: 'queue', label: 'Colas', icon: ArrowRightToLine, demo: { subtype: 'simple', op: 'dequeue', title: 'Demo: dequeue paso a paso' } },
  { type: 'linked-list', label: 'Listas Enlazadas', icon: Link2 },
  { type: 'hash-table', label: 'Tablas Hash', icon: Table2 },
];

interface AppSidebarProps {
  tutorialStep?: number | null;
  onTutorial: () => void;
}

export function AppSidebar({ tutorialStep = null, onTutorial }: AppSidebarProps) {
  const [pinned, setPinned] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const collapsed = tutorialStep === null ? !pinned && !hovered && !keyboardFocus && !themeMenuOpen : tutorialStep !== 0;
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['tree']));

  const activeStructureType = useGraphStore((s) => s.activeStructureType);
  const activeSubtype = useGraphStore((s) => s.activeSubtype);
  const setActiveStructureType = useGraphStore((s) => s.setActiveStructureType);
  const meta = useGraphStore((s) => s.meta);
  const openAlgorithmDemo = useGraphStore((s) => s.openAlgorithmDemo);

  const { user, isAdmin, isTeacher, logout } = useAuth();

  function toggleExpand(type: string) {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function closeMobileMenu() {
    if (window.matchMedia('(max-width: 1023px)').matches) { setPinned(false); setHovered(false); setKeyboardFocus(false); }
  }

  function openDemo(type: string, subtype: string, operation: string) {
    openAlgorithmDemo(type, subtype, operation);
    closeMobileMenu();
  }

  function handleTypeClick(type: string, hasSubItems: boolean) {
    if (hasSubItems) {
      setActiveStructureType(type);
      if (collapsed) { setHovered(true); setExpandedTypes(prev => new Set([...prev, type])); }
      else toggleExpand(type);
    } else {
      setActiveStructureType(navigationFamily(activeStructureType, activeSubtype) === type ? null : type);
      closeMobileMenu();
    }
  }

  return (
    <div className={cn('relative h-full shrink-0 transition-[width] duration-300 ease-out motion-reduce:transition-none', pinned ? 'w-[250px] max-lg:w-16' : 'w-16')}>
    <aside
      data-cy="app-sidebar"
      data-expanded={!collapsed}
      aria-label="Navegación de VISTA"
      onMouseEnter={() => { if (window.matchMedia('(min-width: 1024px) and (hover: hover)').matches) setHovered(true); }}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setKeyboardFocus(false)}
      onFocus={event => { if (event.target.matches(':focus-visible')) setKeyboardFocus(true); }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setKeyboardFocus(false); }}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.currentTarget.querySelector<HTMLButtonElement>('[data-cy=sidebar-toggle]')?.focus();
          setPinned(false); setHovered(false); setKeyboardFocus(false);
        }
      }}
      className={cn('absolute inset-y-0 left-0 z-40 flex flex-col bg-shell border-r border-border overflow-hidden transition-[width] duration-300 ease-out motion-reduce:transition-none', collapsed ? 'w-16' : 'w-[250px]')}
    >
      <div className="flex shrink-0 flex-col items-start gap-2 border-b border-border px-4 py-4">
        <div className="flex items-center gap-3 min-w-0" translate="no">
          <IcesiBrand collapsed={collapsed} />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto scrollbar-custom scrollbar-sidebar py-2 min-h-0">
        {!collapsed && (
          <p className="px-4 pt-3 pb-2 text-[9px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
            Estructuras
          </p>
        )}
        {collapsed && <div className="pt-2" />}

        <nav id="structure-navigation" aria-label="Estructuras" className="flex flex-col gap-0.5 px-1.5">
          {NAV_ITEMS.map(({ type, label, icon: Icon, subItems, demo }) => {
            const isActive = navigationFamily(activeStructureType, activeSubtype) === type;
            const hasSubItems = !!subItems && subItems.length > 0;
            const isExpanded = expandedTypes.has(type);

            return (
              <div key={type} data-cy={`nav-family-${type}`}>
                {/* Main item (+ demo de la familia, HU-19) */}
                <div className="flex items-center gap-1">
                <button
                  onClick={() => handleTypeClick(type, hasSubItems)}
                  title={collapsed ? label : undefined}
                  data-cy={`nav-${type}`}
                  aria-label={label}
                  aria-pressed={isActive}
                  aria-expanded={hasSubItems ? !collapsed && isExpanded : undefined}
                  className={cn(
                    'flex items-center gap-3 py-2.5 text-sm transition-colors duration-150 w-full min-w-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                    'border-l-2',
                    collapsed ? 'justify-center px-0' : 'justify-start px-3',
                    isActive
                      ? 'bg-primary/12 hover:bg-primary/12 text-primary-light border-l-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground border-l-transparent'
                  )}
                >
                  <Icon
                    className={cn(
                      'size-4 shrink-0 transition-colors duration-150',
                      isActive ? 'text-primary-light' : ''
                    )}
                  />
                  {!collapsed && (
                    <>
                      <span className="truncate text-[13px] flex-1 text-left">{label}</span>
                      {hasSubItems ? (
                        <ChevronDown
                          className={cn(
                            'size-3.5 shrink-0 transition-transform duration-200',
                            isExpanded ? 'rotate-180' : ''
                          )}
                        />
                      ) : isActive ? (
                        <span className="size-1.5 rounded-full bg-primary shrink-0" />
                      ) : null}
                    </>
                  )}
                </button>
                {demo && !collapsed && (
                  <button
                    onClick={() => openDemo(type, demo.subtype, demo.op)}
                    data-cy={`demo-${type}-${demo.subtype}`}
                    title={demo.title}
                    aria-label={demo.title}
                    className="flex items-center justify-center size-7 mr-1 text-muted-foreground hover:text-annotation-yellow hover:bg-yellow-main/10 transition-colors duration-150 shrink-0 border border-transparent hover:border-yellow-main/30"
                  >
                    <FlaskConical className="size-3.5" />
                  </button>
                )}
                </div>

                {/* Sub-items (tree subtypes) */}
                {!collapsed && hasSubItems && isExpanded && subItems && (
                  <div className="pl-4 pb-1 flex flex-col gap-0.5">
                    {subItems.map((sub) => {
                      const isSubActive = isActive && activeSubtype === sub.subtype;
                      return (
                        <div key={sub.subtype} className="flex items-center gap-1">
                          <button
                            onClick={() => { setActiveStructureType(type, sub.subtype); closeMobileMenu(); }}
                            data-cy={`nav-${type}-${sub.subtype}`}
                            aria-pressed={isSubActive}
                            className={cn(
                              'flex-1 flex items-center gap-2 py-2 px-3 text-[12px] transition-colors duration-150 border-l-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                              isSubActive
                                ? 'bg-primary/10 hover:bg-primary/10 text-primary-light border-l-primary'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground border-l-transparent'
                            )}
                          >
                            <span className="truncate">{sub.label}</span>
                          </button>
                          {sub.demoOp && (
                            <button
                              onClick={() => openDemo(type, sub.subtype, sub.demoOp!)}
                              data-cy={`demo-${type}-${sub.subtype}`}
                              title={`Demo: ${sub.label} ${sub.demoOp === 'inorder' ? 'recorrido inorden' : 'inserción'}`}
                              aria-label={`Demo de ${sub.label}`}
                              className="flex items-center justify-center size-7 text-muted-foreground hover:text-annotation-yellow hover:bg-yellow-main/10 transition-colors duration-150 shrink-0 border border-transparent hover:border-yellow-main/30"
                            >
                              <FlaskConical className="size-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      {/* Metadata panel */}
      {meta && (
        <>
          <Separator className="bg-border shrink-0" />
          <div
            className={cn(
              'shrink-0',
              collapsed ? 'py-4 flex justify-center' : 'p-4'
            )}
          >
            {collapsed ? (
              <div
                className="size-2 rounded-full bg-secondary shadow-[0_0_8px_#4cb979]"
                title={`${meta.type} · ${meta.nodeCount} nodos`}
              />
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Info className="size-3 text-muted-foreground shrink-0" />
                  <span className="text-[9px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                    Estructura Activa
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-primary-light tracking-widest uppercase">
                    {meta.type}
                  </span>
                  {meta.subtype && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-primary/15 text-muted-foreground">
                      {meta.subtype}
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-muted-foreground font-mono">
                  {meta.nodeCount} nodos · {meta.edgeCount} aristas
                </div>

                {Object.keys(meta.computedProperties).length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-border">
                    {Object.entries(meta.computedProperties).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-[11px] gap-2">
                        <span className="text-muted-foreground truncate">{k}</span>
                        <span className="text-foreground font-mono shrink-0">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}


      </div>

      <div data-cy="sidebar-tools" className="shrink-0 border-t border-border py-2 px-1.5 space-y-1">
        <button type="button" data-cy="tutorial-open" aria-label="Guía de VISTA" title={collapsed ? 'Guía de VISTA' : undefined}
          onClick={onTutorial} className={cn('flex w-full items-center gap-3 py-2.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring', collapsed ? 'justify-center' : 'px-3')}>
          <CircleHelp className="size-4 shrink-0" aria-hidden="true" /><span className={collapsed ? 'sr-only' : ''}>Guía de VISTA</span>
        </button>
        <ThemeToggle sidebar compact={collapsed} onMenuOpenChange={setThemeMenuOpen} />
        <button type="button" data-cy="sidebar-toggle" aria-controls="structure-navigation" aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expandir navegación' : pinned ? 'Contraer navegación' : 'Fijar navegación'}
          title={collapsed ? 'Expandir navegación' : undefined}
          onClick={() => { setPinned(current => !current); setHovered(false); setKeyboardFocus(false); }}
          className={cn('flex w-full items-center gap-3 py-2.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring', collapsed ? 'justify-center' : 'px-3')}>
          {collapsed ? <PanelLeftOpen className="size-4 shrink-0" aria-hidden="true" /> : <PanelLeftClose className="size-4 shrink-0" aria-hidden="true" />}
          <span className={collapsed ? 'sr-only' : ''}>{pinned ? 'Contraer navegación' : 'Fijar navegación'}</span>
        </button>
      </div>

      {/* User footer */}
      {user && (
        <>
          <Separator className="bg-border shrink-0" />
          <div
            className={cn(
              'shrink-0 h-[88px]',
              collapsed ? 'py-3 flex flex-col items-center gap-2' : 'px-3 py-3 flex items-center'
            )}
          >
            {collapsed ? (
              <>
                {isTeacher && (
                  <Link
                    to="/analytics"
                    data-cy="sidebar-analytics"
                    className="text-muted-foreground hover:text-primary-light transition-colors duration-150"
                    title="Panel analítico" aria-label="Panel analítico"
                  >
                    <BarChart3 className="size-3.5" />
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="text-muted-foreground hover:text-annotation-yellow transition-colors duration-150"
                    title="Panel Admin" aria-label="Panel Admin"
                  >
                    <Settings className="size-3.5" />
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="text-muted-foreground hover:text-destructive transition-colors duration-150"
                  title="Cerrar sesión" aria-label="Cerrar sesión"
                >
                  <LogOut className="size-3.5" />
                </button>
              </>
            ) : (
              <div className="flex w-full items-center gap-2">
                <div className="size-7 bg-primary/20 border border-primary/40 flex items-center justify-center text-[10px] font-bold text-primary-light shrink-0">
                  {user.displayName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-foreground truncate">{user.displayName}</p>
                  <p className="text-[9px] text-muted-foreground truncate">{user.email}</p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {isTeacher && (
                    <Link
                      to="/analytics"
                      data-cy="sidebar-analytics"
                      className="text-muted-foreground hover:text-primary-light transition-colors duration-150 p-1"
                      title="Panel analítico" aria-label="Panel analítico"
                    >
                      <BarChart3 className="size-3.5" />
                    </Link>
                  )}
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="text-muted-foreground hover:text-annotation-yellow transition-colors duration-150 p-1"
                      title="Panel Admin" aria-label="Panel Admin"
                    >
                      <Settings className="size-3.5" />
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="text-muted-foreground hover:text-destructive transition-colors duration-150 p-1"
                    title="Cerrar sesión" aria-label="Cerrar sesión"
                  >
                    <LogOut className="size-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
    </div>
  );
}
