/**
 * Árbol decorativo del panel de marca.
 *
 * <p>Reproduce el motivo del diseño en pen. Usa las mismas familias de color que la escena 3D
 * (`primary` → `purple` → `secondary` por profundidad), de modo que la pantalla de entrada ya
 * enseña el lenguaje visual del producto en lugar de un adorno cualquiera.
 */
const NODES = [
  { cx: 345, cy: 26, r: 12, fill: '#5454E9' },
  { cx: 196, cy: 112, r: 10, fill: '#865FF0' },
  { cx: 494, cy: 112, r: 10, fill: '#865FF0' },
  { cx: 112, cy: 208, r: 8, fill: '#4CB979' },
  { cx: 268, cy: 208, r: 8, fill: '#4CB979' },
  { cx: 418, cy: 208, r: 8, fill: '#4CB979' },
  { cx: 574, cy: 208, r: 8, fill: '#4CB979' },
];

const EDGES = [
  [0, 1],
  [0, 2],
  [1, 3],
  [1, 4],
  [2, 5],
  [2, 6],
] as const;

export function GraphMotif({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 691 250"
      className={className}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      {EDGES.map(([from, to]) => (
        <line
          key={`${from}-${to}`}
          x1={NODES[from].cx}
          y1={NODES[from].cy}
          x2={NODES[to].cx}
          y2={NODES[to].cy}
          stroke="#5454E9"
          strokeOpacity={0.35}
          strokeWidth={1.5}
        />
      ))}
      {NODES.map((n, i) => (
        <circle key={i} cx={n.cx} cy={n.cy} r={n.r} fill={n.fill} />
      ))}
    </svg>
  );
}
