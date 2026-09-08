import { useEffect, useMemo, useRef, useState } from 'react';
import type { Edge3D, Node3D } from '@/types/graph';
import {
  CANVAS_BACKGROUND,
  EDGE_COLORS,
  boundsOf,
  detectLayoutKind,
  edgeEndpoints,
  labelColorFor,
  layout2D,
  nodeFill,
  type Layout2D,
  type LayoutKind,
} from '@/core';
import { useModel } from '../useModel';
import type { SvgRenderer } from './SvgRenderer';

const NODE_RADIUS = 22;
const PADDING = 60;
/** Ventana mínima: una estructura pequeña no se agranda hasta llenar la pantalla. */
const MIN_VIEW_W = 960;
const MIN_VIEW_H = 620;
/** Sitio para la barra de descripción del paso, que se superpone al borde inferior del lienzo. */
const BOTTOM_ROOM = 110;
/** Cuánto sobrevive en pantalla un nodo retirado, desvaneciéndose (HU-19 · CA-5). */
const GHOST_MS = 320;

const KIND_LABEL: Record<LayoutKind, string> = {
  tree: 'Árbol',
  circular: 'Grafo',
  force: 'Grafo',
  linear: 'Lista enlazada',
  stack: 'Pila',
  queue: 'Cola',
};

const ROLE_LABEL: Record<string, string> = {
  top: 'tope',
  bottom: 'base',
  front: 'frente',
  rear: 'final',
};

const STATE_LABEL: Record<string, string> = {
  visited: 'visitado',
  frontier: 'en cola',
  current: 'en visita',
  unvisited: 'sin visitar',
};

interface Ghost {
  node: Node3D;
  at: { x: number; y: number };
  fill: string;
}

interface SvgViewProps {
  renderer: SvgRenderer;
}

function describe(kind: LayoutKind, nodes: Node3D[], edges: Edge3D[]): string {
  if (nodes.length === 0) return 'Lienzo 2D vacío';
  const base = `${KIND_LABEL[kind]} con ${nodes.length} ${nodes.length === 1 ? 'elemento' : 'elementos'}`;
  if (kind === 'stack') {
    const top = nodes.find((n) => n.properties?.role === 'top') ?? nodes[nodes.length - 1];
    return `${base} en modo 2D; tope ${top.label}`;
  }
  if (kind === 'queue') {
    const front = nodes.find((n) => n.properties?.role === 'front') ?? nodes[0];
    const rear = nodes.find((n) => n.properties?.role === 'rear') ?? nodes[nodes.length - 1];
    return `${base} en modo 2D; frente ${front.label}, final ${rear.label}`;
  }
  return `${base} y ${edges.length} ${edges.length === 1 ? 'arista' : 'aristas'} en modo 2D`;
}

function nodeDescription(node: Node3D, kind: LayerKind, highlighted: boolean, highlightType: string | null): string {
  const parts = [kind === 'stack' || kind === 'queue' ? `Elemento ${node.label}` : `Nodo ${node.label}`];
  const role = node.properties?.role;
  if (typeof role === 'string' && ROLE_LABEL[role]) parts.push(ROLE_LABEL[role]);
  const state = node.properties?.state;
  if (typeof state === 'string' && STATE_LABEL[state]) parts.push(STATE_LABEL[state]);
  if (highlighted && highlightType) parts.push(highlightType);
  return parts.join(', ');
}

type LayerKind = LayoutKind;

/** Vista React del adaptador 2D. Lee el modelo del adaptador y nada más. */
export function SvgView({ renderer }: SvgViewProps) {
  const { structure, highlightedIds, highlightType } = useModel(renderer.model);
  const kind = useMemo(() => detectLayoutKind(structure), [structure]);
  const layout = useMemo(() => layout2D(structure), [structure]);
  const highlighted = useMemo(() => new Set(highlightedIds), [highlightedIds]);

  // Fantasmas: los nodos que estaban y ya no están se desvanecen en vez de desaparecer de golpe,
  // para que el retiro (pop, dequeue) se distinga del cuadro anterior (CA-5).
  const previous = useRef<{ layout: Layout2D; nodes: Node3D[]; fills: Record<string, string> }>({
    layout: {},
    nodes: [],
    fills: {},
  });
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  useEffect(() => {
    const currentIds = new Set(structure.nodes.map((n) => n.id));
    const gone = previous.current.nodes.filter((n) => !currentIds.has(n.id));
    const fills: Record<string, string> = {};
    for (const n of structure.nodes) {
      fills[n.id] = nodeFill(n.depth, n.properties?.state, highlighted.has(n.id), highlightType);
    }
    if (gone.length > 0) {
      const prev = previous.current;
      const next = gone
        .filter((n) => prev.layout[n.id])
        .map((n) => ({ node: n, at: prev.layout[n.id], fill: prev.fills[n.id] ?? '#5454e9' }));
      // Los fantasmas se programan fuera del efecto (siguiente tick) y se retiran al terminar la
      // transición: ningún setState síncrono dentro del efecto.
      const show = window.setTimeout(() => setGhosts(next), 0);
      const hide = window.setTimeout(() => setGhosts([]), GHOST_MS);
      previous.current = { layout, nodes: structure.nodes, fills };
      return () => {
        window.clearTimeout(show);
        window.clearTimeout(hide);
      };
    }
    previous.current = { layout, nodes: structure.nodes, fills };
    return undefined;
  }, [structure, layout, highlighted, highlightType]);

  const bounds = useMemo(() => boundsOf(layout, PADDING), [layout]);
  const contentW = bounds.maxX - bounds.minX;
  const contentH = bounds.maxY - bounds.minY + BOTTOM_ROOM;
  const width = Math.max(contentW, MIN_VIEW_W);
  const height = Math.max(contentH, MIN_VIEW_H);
  const viewX = bounds.minX - (width - contentW) / 2;
  const viewY = bounds.minY - (height - contentH) / 2;
  const empty = structure.nodes.length === 0;
  const label = describe(kind, structure.nodes, structure.edges);
  const isBox = kind === 'stack' || kind === 'queue';

  return (
    <div data-cy="canvas-2d" data-mode="2D" data-kind={kind} className="absolute inset-0" style={{ background: CANVAS_BACKGROUND }}>
      {empty && ghosts.length === 0 ? (
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
            <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE_COLORS.directed} />
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
            const gap = isBox ? NODE_RADIUS + 6 : NODE_RADIUS;
            const x1 = ends.from.x + ux * gap;
            const y1 = ends.from.y + uy * gap;
            const x2 = ends.to.x - ux * (gap + (edge.directed ? 2 : 0));
            const y2 = ends.to.y - uy * (gap + (edge.directed ? 2 : 0));
            const color = edge.directed ? EDGE_COLORS.directed : EDGE_COLORS.undirected;
            const fromLabel = structure.nodes.find((n) => n.id === edge.from)?.label ?? edge.from;
            const toLabel = structure.nodes.find((n) => n.id === edge.to)?.label ?? edge.to;
            const title = `${fromLabel} ${edge.directed ? '→' : '—'} ${toLabel}${edge.weight !== null ? ` (peso ${edge.weight})` : ''}`;
            return (
              <g key={edge.id} data-edge-id={edge.id} className="transition-all duration-300">
                <title>{title}</title>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={color}
                  strokeOpacity={0.9}
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
                    stroke={CANVAS_BACKGROUND}
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
        <g data-layer="ghosts" aria-hidden="true">
          {ghosts.map((g) => (
            <g
              key={`ghost-${g.node.id}`}
              data-ghost-id={g.node.id}
              style={{
                transform: `translate(${g.at.x}px, ${g.at.y - 18}px) scale(0.9)`,
                opacity: 0,
                transition: `opacity ${GHOST_MS}ms ease, transform ${GHOST_MS}ms ease`,
              }}
            >
              {isBox ? (
                <rect x={-NODE_RADIUS * 2.2} y={-NODE_RADIUS} width={NODE_RADIUS * 4.4} height={NODE_RADIUS * 2} fill={g.fill} />
              ) : (
                <circle r={NODE_RADIUS} fill={g.fill} />
              )}
            </g>
          ))}
        </g>
        <g data-layer="nodes">
          {structure.nodes.map((node) => {
            const p = layout[node.id];
            if (!p) return null;
            const isHl = highlighted.has(node.id);
            const color = nodeFill(node.depth, node.properties?.state, isHl, highlightType);
            const textFill = labelColorFor(color);
            const role = typeof node.properties?.role === 'string' ? (node.properties.role as string) : undefined;
            const roleText = role && ROLE_LABEL[role] ? ROLE_LABEL[role] : null;
            return (
              <g
                key={node.id}
                data-node-id={node.id}
                data-label={node.label}
                data-highlighted={isHl ? 'true' : 'false'}
                data-role={role}
                role="img"
                aria-label={nodeDescription(node, kind, isHl, highlightType)}
                style={{ transform: `translate(${p.x}px, ${p.y}px)`, transition: 'transform 300ms ease' }}
              >
                {isHl && !isBox && <circle r={NODE_RADIUS * 1.5} fill={color} fillOpacity={0.18} />}
                {isBox ? (
                  <rect
                    x={-NODE_RADIUS * 2.2}
                    y={-NODE_RADIUS}
                    width={NODE_RADIUS * 4.4}
                    height={NODE_RADIUS * 2}
                    fill={color}
                    stroke={isHl ? '#ffffff' : 'rgba(255,255,255,0.25)'}
                    strokeWidth={isHl ? 2 : 1}
                    style={{ transition: 'fill 200ms ease' }}
                  />
                ) : (
                  <circle
                    r={isHl ? NODE_RADIUS * 1.12 : NODE_RADIUS}
                    fill={color}
                    stroke={isHl ? '#ffffff' : 'rgba(255,255,255,0.25)'}
                    strokeWidth={isHl ? 2 : 1}
                    style={{ transition: 'r 200ms ease, fill 200ms ease' }}
                  />
                )}
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
                {roleText && (
                  <text
                    x={kind === 'stack' ? NODE_RADIUS * 2.2 + 10 : 0}
                    y={kind === 'stack' ? 0 : -NODE_RADIUS - 10}
                    textAnchor={kind === 'stack' ? 'start' : 'middle'}
                    dominantBaseline={kind === 'stack' ? 'central' : 'auto'}
                    fontSize={11}
                    fontFamily="Geist Variable, Geist, sans-serif"
                    fill="#a0a0a0"
                    data-role-label={role}
                  >
                    {roleText}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
