import { AppSidebar } from './components/AppSidebar';
import { ChatPanel } from './components/ChatPanel';
import { AlgorithmPanel } from './components/AlgorithmPanel';
import { CanvasOverlay } from './components/CanvasOverlay';
import GraphVis3D from './components/GraphVis3D';
import { useGraphStore } from './store/graphStore';

export default function App() {
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
    <div className="flex h-screen w-screen overflow-hidden bg-black-main">
      <AppSidebar />

      <div className="flex flex-1 overflow-hidden min-w-0">
        {/* Canvas area */}
        <div className="relative flex-1 overflow-hidden min-w-0">
          <GraphVis3D />
          <CanvasOverlay
            chatOpen={chatOpen}
            onToggleChat={toggleChat}
            algorithmOpen={algorithmOpen}
            onToggleAlgorithm={toggleAlgorithm}
          />
        </div>

        {/* Right panels — only one open at a time */}
        <ChatPanel
          open={chatOpen}
          onClose={() => setChatOpen(false)}
        />
        <AlgorithmPanel
          open={algorithmOpen}
          onClose={() => setAlgorithmOpen(false)}
        />
      </div>
    </div>
  );
}
