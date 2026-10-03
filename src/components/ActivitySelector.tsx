import { FlaskConical, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ActivitySelector({ chatOpen, algorithmOpen, onToggleChat, onToggleAlgorithm }: {
  chatOpen: boolean; algorithmOpen: boolean; onToggleChat: () => void; onToggleAlgorithm: () => void;
}) {
  return (
    <div data-cy="activity-dock" className="flex h-16 shrink-0 items-center justify-end bg-canvas px-4 pb-[env(safe-area-inset-bottom)]">
      <div role="group" aria-label="Actividad" data-cy="activity-selector" className="flex h-10 items-center gap-[3px] border border-border bg-shell/85 px-[3px]">
        {[
          { label: 'Chat', icon: MessageSquare, active: chatOpen, action: onToggleChat, cy: 'chat-toggle' },
          { label: 'Algoritmos', icon: FlaskConical, active: algorithmOpen, action: onToggleAlgorithm, cy: 'algorithm-toggle' },
        ].map(({ label, icon: Icon, active, action, cy }) => (
          <button key={cy} type="button" data-cy={cy} aria-pressed={active} onClick={action}
            className={cn('flex items-center gap-1.5 px-3 py-[7px] text-xs font-semibold hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring', active ? 'bg-primary text-primary-foreground hover:text-primary-foreground' : 'text-muted-foreground')}>
            <Icon className="size-3.5" aria-hidden="true" />{label}
          </button>
        ))}
      </div>
    </div>
  );
}
