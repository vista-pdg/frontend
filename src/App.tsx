import { useState } from 'react';
import { ActivitySelector } from './components/ActivitySelector';
import { InterfaceTutorial } from './components/InterfaceTutorial';
import { AppSidebar } from './components/AppSidebar';
import { ChatPanel } from './components/ChatPanel';
import { AlgorithmPanel } from './components/AlgorithmPanel';
import { CanvasOverlay } from './components/CanvasOverlay';
import { VisualizationCanvas } from './components/VisualizationCanvas';
import { useGraphStore } from './store/graphStore';

export default function App() {
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const tutorialOpen = tutorialStep !== null;
  const [tutorialHeight, setTutorialHeight] = useState(0);
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
    <div data-cy="application-area" className="flex h-dvh w-screen overflow-hidden bg-shell" style={tutorialOpen ? { height: `calc(100dvh - ${tutorialHeight}px)` } : undefined}>
      <AppSidebar tutorialStep={tutorialStep} onTutorial={() => { setTutorialHeight(0); setTutorialStep(0); }} />

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
      {tutorialOpen && <InterfaceTutorial index={tutorialStep} onDockHeight={setTutorialHeight} onStepChange={setTutorialStep} onClose={() => setTutorialStep(null)} />}
    </div>
  );
}
