import { useEffect, useId, useRef, useState } from 'react';
import { ChevronUp, Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setTheme, useTheme, useThemePreference, type ThemePreference } from '@/lib/theme';

function SidebarThemeMenu({ compact, onOpenChange }: { compact: boolean; onOpenChange?: (open: boolean) => void }) {
  const preference = useThemePreference();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLFieldSetElement>(null);
  const id = useId();
  const changeOpen = (value: boolean) => { setOpen(value); onOpenChange?.(value); };
  const close = (restoreFocus = false) => {
    changeOpen(false);
    if (restoreFocus) requestAnimationFrame(() => trigger.current?.focus());
  };
  const choose = (value: ThemePreference) => { setTheme(value); close(true); };
  useEffect(() => {
    if (!open) return;
    popup.current?.querySelector<HTMLInputElement>('input:checked')?.focus();
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        setOpen(false);
        onOpenChange?.(false);
      }
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, onOpenChange]);
  const Icon = preference === 'system' ? Monitor : preference === 'dark' ? Moon : Sun;
  return (
    <div ref={root} className="relative"
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) close(); }}
      onKeyDown={event => { if (open && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); } }}>
      <button ref={trigger} type="button" data-cy="theme-toggle" aria-label="Tema"
        aria-expanded={open} aria-controls={open ? id : undefined} title={compact ? 'Tema' : undefined}
        onClick={() => changeOpen(!open)}
        className={cn('flex w-full items-center gap-3 py-2.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring', compact ? 'justify-center px-0' : 'px-3')}>
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className={compact ? 'sr-only' : 'flex-1 text-left'}>Tema</span>
        {!compact && <ChevronUp className="size-3.5 shrink-0" aria-hidden="true" />}
      </button>
      {open && (
        <fieldset ref={popup} id={id} data-cy="theme-menu" aria-label="Tema"
          className="absolute bottom-full left-0 z-50 mb-2 w-56 max-w-[calc(100vw_-_1.5rem)] border border-border bg-popover text-popover-foreground">
          {[
            { value: 'system', label: 'Sistema', icon: Monitor },
            { value: 'light', label: 'Claro', icon: Sun },
            { value: 'dark', label: 'Oscuro', icon: Moon },
          ].map(({ value, label, icon: OptionIcon }) => (
            <label key={value} className={cn('relative flex cursor-pointer items-center gap-3 px-5 py-3 text-sm has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ring', preference === value ? 'bg-primary text-primary-foreground hover:bg-primary-dark' : 'hover:bg-accent hover:text-accent-foreground')}>
              <input type="radio" name={id} value={value} data-cy={`theme-${value}`} className="absolute inset-0 size-full cursor-pointer opacity-0"
                checked={preference === value} onChange={() => choose(value as ThemePreference)}
                onClick={() => { if (preference === value) choose(value as ThemePreference); }} />
              <OptionIcon className="size-5" aria-hidden="true" />{label}
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}

export function ThemeToggle({ sidebar = false, compact = false, onMenuOpenChange }: { sidebar?: boolean; compact?: boolean; onMenuOpenChange?: (open: boolean) => void }) {
  const theme = useTheme();
  if (sidebar) return <SidebarThemeMenu compact={compact} onOpenChange={onMenuOpenChange} />;
  return (
    <button type="button" data-cy="theme-toggle" aria-pressed={theme === 'light'}
      aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="inline-flex items-center gap-2 border border-border bg-background px-3 py-2 text-xs text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
      {theme === 'dark' ? <Sun className="size-3.5" aria-hidden="true" /> : <Moon className="size-3.5" aria-hidden="true" />}
      <span>{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
    </button>
  );
}
