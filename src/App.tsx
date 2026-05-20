import GraphVis3D from './components/GraphVis3D';
import GraphChat from './components/GraphChat';
import { useGraphStore } from './store/graphStore';

export default function App() {
  const meta = useGraphStore((s) => s.meta);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      {/* Canvas ocupa todo */}
      <GraphVis3D />

      {/* Badge de metadata — top left */}
      {meta && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-slate-950/85 px-3.5 py-2 backdrop-blur-md">
          <span className="text-[11px] font-bold tracking-widest text-indigo-400">
            {meta.type.toUpperCase()}
          </span>
          {meta.subtype && (
            <span className="rounded px-1.5 py-0.5 text-[11px] bg-indigo-500/15 text-slate-400">
              {meta.subtype}
            </span>
          )}
          <span className="text-[11px] text-slate-500">
            {meta.nodeCount}N · {meta.edgeCount}E
          </span>
        </div>
      )}

      {/* Chat panel — bottom right */}
      <div className="absolute bottom-5 right-5 z-10">
        <GraphChat />
      </div>
    </div>
  );
}
