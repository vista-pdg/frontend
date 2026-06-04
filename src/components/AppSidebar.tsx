import { useState } from 'react';
import {
  Network,
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
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGraphStore } from '@/store/graphStore';
import { Separator } from '@/components/ui/separator';

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
}

const NAV_ITEMS: NavItem[] = [
  { type: 'graph', label: 'Grafos', icon: GitFork },
  {
    type: 'tree',
    label: 'Árboles',
    icon: GitBranch,
    subItems: [
      { subtype: 'avl', label: 'AVL', demoOp: 'insert' },
      { subtype: 'bst', label: 'Árbol BST' },
      { subtype: 'btree', label: 'B-árbol' },
    ],
  },
  { type: 'heap', label: 'Heaps', icon: ChevronUp },
  { type: 'linked-list', label: 'Listas Enlazadas', icon: Link2 },
  { type: 'hash-table', label: 'Tablas Hash', icon: Table2 },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['tree']));

  const activeStructureType = useGraphStore((s) => s.activeStructureType);
  const activeSubtype = useGraphStore((s) => s.activeSubtype);
  const setActiveStructureType = useGraphStore((s) => s.setActiveStructureType);
  const meta = useGraphStore((s) => s.meta);
  const openAlgorithmDemo = useGraphStore((s) => s.openAlgorithmDemo);

  function toggleExpand(type: string) {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function handleTypeClick(type: string, hasSubItems: boolean) {
    if (hasSubItems) {
      setActiveStructureType(type);
      toggleExpand(type);
    } else {
      setActiveStructureType(activeStructureType === type ? null : type);
    }
  }

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-black-main border-r border-border',
        'transition-all duration-300 ease-in-out shrink-0 overflow-hidden',
        collapsed ? 'w-14' : 'w-[280px]'
      )}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary shrink-0" />

      {/* Header */}
      <div
        className={cn(
          'flex items-center border-b border-border mt-[2px] shrink-0',
          collapsed ? 'justify-center py-4 px-0' : 'justify-between px-4 py-4'
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="size-8 bg-primary flex items-center justify-center shrink-0">
            <Network className="size-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-[13px] font-bold tracking-[0.25em] text-white uppercase leading-none">
                VISTA
              </span>
              <span className="text-[9px] tracking-widest text-muted-foreground uppercase">
                Visualizador 3D
              </span>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="text-muted-foreground hover:text-white transition-colors duration-150 p-1"
            title="Colapsar sidebar"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="flex justify-center py-3 text-muted-foreground hover:text-white transition-colors duration-150 border-b border-border shrink-0"
          title="Expandir sidebar"
        >
          <PanelLeftOpen className="size-4" />
        </button>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto scrollbar-custom scrollbar-sidebar py-2 min-h-0">
        {!collapsed && (
          <p className="px-4 pt-3 pb-2 text-[9px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
            Estructuras
          </p>
        )}
        {collapsed && <div className="pt-2" />}

        <nav className="flex flex-col gap-0.5 px-1.5">
          {NAV_ITEMS.map(({ type, label, icon: Icon, subItems }) => {
            const isActive = activeStructureType === type;
            const hasSubItems = !!subItems && subItems.length > 0;
            const isExpanded = expandedTypes.has(type);

            return (
              <div key={type}>
                {/* Main item */}
                <button
                  onClick={() => handleTypeClick(type, hasSubItems)}
                  title={collapsed ? label : undefined}
                  className={cn(
                    'flex items-center gap-3 py-2.5 text-sm transition-all duration-150 w-full',
                    'border-l-2',
                    collapsed ? 'justify-center px-0' : 'justify-start px-3',
                    isActive
                      ? 'bg-primary/12 text-primary border-l-primary'
                      : 'text-muted-foreground hover:bg-white/5 hover:text-white border-l-transparent'
                  )}
                >
                  <Icon
                    className={cn(
                      'size-4 shrink-0 transition-colors duration-150',
                      isActive ? 'text-primary' : ''
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

                {/* Sub-items (tree subtypes) */}
                {!collapsed && hasSubItems && isExpanded && subItems && (
                  <div className="pl-4 pb-1 flex flex-col gap-0.5">
                    {subItems.map((sub) => {
                      const isSubActive = isActive && activeSubtype === sub.subtype;
                      return (
                        <div key={sub.subtype} className="flex items-center gap-1">
                          <button
                            onClick={() => setActiveStructureType(type, sub.subtype)}
                            className={cn(
                              'flex-1 flex items-center gap-2 py-2 px-3 text-[12px] transition-all duration-150 border-l-2',
                              isSubActive
                                ? 'bg-primary/10 text-primary border-l-primary'
                                : 'text-muted-foreground hover:bg-white/5 hover:text-white border-l-transparent'
                            )}
                          >
                            <span className="truncate">{sub.label}</span>
                          </button>
                          {sub.demoOp && (
                            <button
                              onClick={() => openAlgorithmDemo(type, sub.subtype, sub.demoOp!)}
                              title={`Demo: ${sub.label} inserción`}
                              className="flex items-center justify-center size-7 text-muted-foreground hover:text-yellow-main hover:bg-yellow-main/10 transition-colors duration-150 shrink-0 border border-transparent hover:border-yellow-main/30"
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
      </div>

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
                  <span className="text-[11px] font-bold text-primary tracking-widest uppercase">
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
                        <span className="text-white font-mono shrink-0">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
