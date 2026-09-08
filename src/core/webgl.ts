/**
 * Detección de WebGL (HU-18 · CA-6).
 *
 * <p>Se prueba una sola vez por carga: crear contextos es caro y el resultado no cambia mientras
 * viva la página. Cualquier excepción cuenta como "no disponible": es el caso de los navegadores
 * que bloquean el contexto por política o de entornos sin GPU.
 */
export function detectWebGL(doc: Pick<Document, 'createElement'> | undefined = globalDocument()): boolean {
  if (!doc) return false;
  try {
    const canvas = doc.createElement('canvas') as HTMLCanvasElement;
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    return gl !== null && gl !== undefined;
  } catch {
    return false;
  }
}

function globalDocument(): Document | undefined {
  return typeof document === 'undefined' ? undefined : document;
}
