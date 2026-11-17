import { ActivitySelector } from './ActivitySelector';
import { ChatPanel } from './ChatPanel';
import { AlgorithmPanel } from './AlgorithmPanel';
import { CanvasOverlay } from './CanvasOverlay';
import { VisualizationCanvas } from './VisualizationCanvas';
import { useGraphStore } from '@/store/graphStore';

/**
 * Espacio de trabajo de VISTA: lienzo, selector de actividad, chat y panel de algoritmos. Lo usan
 * el visualizador y el modo de prueba de los quizzes (HU-34), para que el estudiante resuelva con
 * exactamente las mismas herramientas con las que practica.
 */
export function Workspace({ tutorialStep = null }: { tutorialStep?: number | null }) {
  const tutorialOpen = tutorialStep !== null;
  const chatOpen = useGraphStore((s) => s.chatOpen);
  const setChatOpen = useGraphStore((s) => s.setChatOpen);
  const algorithmOpen = useGraphStore((s) => s.algorithmOpen);
  const setAlgorithmOpen = useGraphStore((s) => s.setAlgorithmOpen);

  function toggleChat() {
    if (!chatOpen) {
      setAlgorithmOpen(false);
    }
    setChatOpen(!chatOpen);
  }

  function toggleAlgorithm() {
    if (!algorithmOpen) {
      setChatOpen(false);
    }
    setAlgorithmOpen(!algorithmOpen);
  }

  return (
    <div className="relative flex flex-1 overflow-hidden min-w-0 min-h-0">
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 min-h-0">
        <div className="relative flex-1 overflow-hidden min-w-0 min-h-0">
          <VisualizationCanvas />
          <CanvasOverlay tutorialStep={tutorialStep} />
        </div>
        <ActivitySelector chatOpen={tutorialOpen ? tutorialStep === 1 : chatOpen} algorithmOpen={tutorialOpen ? tutorialStep === 2 : algorithmOpen} onToggleChat={toggleChat} onToggleAlgorithm={toggleAlgorithm} />
      </div>
      <ChatPanel
        open={tutorialOpen ? tutorialStep === 1 : chatOpen}
        onClose={() => setChatOpen(false)}
      />
      <AlgorithmPanel
        open={tutorialOpen ? tutorialStep === 2 : algorithmOpen}
        onClose={() => setAlgorithmOpen(false)}
      />
    </div>
  );
}
