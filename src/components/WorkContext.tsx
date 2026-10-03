import { useGraphStore } from '@/store/graphStore';
import { STRUCTURES, contextKey } from '@/lib/workContext';

/** Read-only context on the canvas; structure and activity are selected only in the sidebar. */
export function WorkContext() {
  const type = useGraphStore(s => s.activeStructureType);
  const subtype = useGraphStore(s => s.activeSubtype);
  const chatOpen = useGraphStore(s => s.chatOpen);
  const algorithmOpen = useGraphStore(s => s.algorithmOpen);
  const canvas = useGraphStore(s => s.canvasContext);
  const key = contextKey(type, subtype);
  const label = STRUCTURES.find(s => s.key === key)?.label ?? (type === 'tree' ? 'Árboles' : type ?? 'Elige una estructura');
  return (
    <div data-cy="work-context" className="min-w-0 text-xs text-muted-foreground">
      <p data-cy="work-mode">{label} · {algorithmOpen ? 'Algoritmos' : chatOpen ? 'Chat' : 'Lienzo'}</p>
      {canvas && type && (canvas.type !== type || (subtype && canvas.subtype !== subtype)) && (
        <p role="status" className="mt-1 max-w-md leading-relaxed">El lienzo conserva {canvas.type}{canvas.subtype ? ` · ${canvas.subtype}` : ''}. La siguiente operación usará {label}.</p>
      )}
    </div>
  );
}
