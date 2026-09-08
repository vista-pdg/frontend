import { svgRenderer, threeRenderer } from '@/renderers/appEngine';
import { SvgView } from '@/renderers/svg/SvgView';
import { ThreeView } from '@/renderers/three/ThreeView';
import { useGraphStore } from '@/store/graphStore';

/**
 * Monta la vista del adaptador activo. El estado que ambas dibujan es del motor; cambiar de modo
 * sólo cambia qué vista está montada (HU-18).
 */
export function VisualizationCanvas() {
  const mode = useGraphStore((s) => s.mode);
  const autoRotate = useGraphStore((s) => s.autoRotate);
  const cameraResetKey = useGraphStore((s) => s.cameraResetKey);

  if (mode === '2D') return <SvgView renderer={svgRenderer} />;
  return <ThreeView renderer={threeRenderer} autoRotate={autoRotate} cameraResetKey={cameraResetKey} />;
}
