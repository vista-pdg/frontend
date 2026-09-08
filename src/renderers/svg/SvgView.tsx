import { useMemo } from 'react';
import type { HighlightType } from '@/types/graph';
import { boundsOf, edgeEndpoints, layout2D } from '@/core';
import { useModel } from '../useModel';
import type { SvgRenderer } from './SvgRenderer';

const NODE_RADIUS = 22;
const PADDING = 60;
/** Ventana mínima: una estructura pequeña no se agranda hasta llenar la pantalla. */
const MIN_VIEW_W = 960;
const MIN_VIEW_H = 620;
/** Sitio para la barra de descripción del paso, que se superpone al borde inferior del lienzo. */
const BOTTOM_ROOM = 110;

/** Mismos acentos que la escena 3D (NodeSphere), para que el cambio de modo no cambie el código de color. */
const DEPTH_COLORS = ['#5454e9', '#865FF0', '#4cb979', '#E9683B', '#E4EB60'];
const HIGHLIGHT_COLORS: Record<HighlightType, string> = {
  initial: '#5454e9',
  insert: '#E9683B',
  unbalanced: '#d32f2f',
  rotated: '#E4EB60',
  balanced: '#4cb979',
};
/** Etiquetas oscuras sobre los acentos claros (amarillo) y blancas sobre el resto: AA en ambos casos. */
const DARK_LABEL_ON = new Set(['#E4EB60']);

interface SvgViewProps {
  renderer: SvgRenderer;
  description?: string;
}

/** Vista React del adaptador 2D. Lee el modelo del adaptador y nada más. */
export function SvgView({ renderer, description }: SvgViewProps) {
  const { structure, highlightedIds, highlightType } = useModel(renderer.model);
  const layout = useMemo(() => layout2D(structure), [structure]);
  const bounds = useMemo(() => boundsOf(layout, PADDING), [layout]);
  const highlighted = useMemo(() => new Set(highlightedIds), [highlightedIds]);

  const contentW = bounds.maxX - bounds.minX;
  const contentH = bounds.maxY - bounds.minY + BOTTOM_ROOM;
  const width = Math.max(contentW, MIN_VIEW_W);
  const height = Math.max(contentH, MIN_VIEW_H);
  const viewX = bounds.minX - (width - contentW) / 2;
  const viewY = bounds.minY - (height - contentH) / 2;
  const empty = structure.nodes.length === 0;
  const label =
    description ??
    (empty
      ? 'Lienzo 2D vacío'
      : `Estructura con ${structure.nodes.length} nodos y ${structure.edges.length} aristas en modo 2D`);

  return (
    <div data-cy="canvas-2d" data-mode="2D" className="absolute inset-0 bg-[#0b0b12]">
      {empty ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 select-none">
          <span className="text-[18px] font-semibold text-primary-light">Sin estructura</span>
          <span className="text-[12px] text-muted-foreground">Describe una estructura en el chat</span>
        </div>
      ) : null}
      <svg
        ref={(el) => renderer.attachRoot(el)}
        role="img"
        aria-label={label}
        data-cy="svg-scene"
        className="absolute inset-0 h-full w-full"
        viewBox={`${viewX} ${viewY} ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <title>{label}</title>
        <defs>
          <marker id="vista-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#5454e9" />
          </marker>
        </defs>
        <g data-layer="edges">
          {structure.edges.map((edge) => {
            const ends = edgeEndpoints(edge, layout);
            if (!ends) return null;
            const dx = ends.to.x - ends.from.x;
            const dy = ends.to.y - ends.from.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const x1 = ends.from.x + ux * NODE_RADIUS;
            const y1 = ends.from.y + uy * NODE_RADIUS;
            const x2 = ends.to.x - ux * (NODE_RADIUS + (edge.directed ? 2 : 0));
            const y2 = ends.to.y - uy * (NODE_RADIUS + (edge.directed ? 2 : 0));
            const color = edge.directed ? '#5454e9' : '#4cb979';
            return (
              <g key={edge.id} data-edge-id={edge.id} className="transition-all duration-300">
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={color}
                  strokeOpacity={0.85}
                  strokeWidth={edge.directed ? 2 : 1.5}
                  markerEnd={edge.directed ? 'url(#vista-arrow)' : undefined}
                />
                {edge.weight !== null && (
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 6}
                    textAnchor="middle"
                    fontSize={12}
                    fontFamily="Geist Variable, Geist, sans-serif"
                    fill="#E4EB60"
                    stroke="#0b0b12"
                    strokeWidth={3}
                    paintOrder="stroke"
                  >
                    {edge.weight}
                  </text>
                )}
              </g>
            );
          })}
        </g>
        <g data-layer="nodes">
          {structure.nodes.map((node) => {
            const p = layout[node.id];
            if (!p) return null;
            const isHl = highlighted.has(node.id);
            const color = isHl && highlightType ? HIGHLIGHT_COLORS[highlightType] : DEPTH_COLORS[node.depth % DEPTH_COLORS.length];
            const textFill = DARK_LABEL_ON.has(color) ? '#000000' : '#ffffff';
            return (
              <g
                key={node.id}
                data-node-id={node.id}
                data-label={node.label}
                data-highlighted={isHl ? 'true' : 'false'}
                role="img"
                aria-label={`Nodo ${node.label}${isHl && highlightType ? `, ${highlightType}` : ''}`}
                style={{ transform: `translate(${p.x}px, ${p.y}px)`, transition: 'transform 300ms ease' }}
              >
                {isHl && <circle r={NODE_RADIUS * 1.5} fill={color} fillOpacity={0.18} />}
                <circle
                  r={isHl ? NODE_RADIUS * 1.12 : NODE_RADIUS}
                  fill={color}
                  stroke={isHl ? '#ffffff' : 'rgba(255,255,255,0.25)'}
                  strokeWidth={isHl ? 2 : 1}
                  style={{ transition: 'r 200ms ease, fill 200ms ease' }}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={13}
                  fontWeight={700}
                  fontFamily="Geist Variable, Geist, sans-serif"
                  fill={textFill}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
