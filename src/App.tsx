import { useState } from 'react';
import { InterfaceTutorial } from './components/InterfaceTutorial';
import { AppSidebar } from './components/AppSidebar';
import { Workspace } from './components/Workspace';
import { QuizNotice } from './components/quiz/QuizNotice';

export default function App() {
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const tutorialOpen = tutorialStep !== null;
  const [tutorialHeight, setTutorialHeight] = useState(0);

  return (
    <div data-cy="application-area" className="flex h-dvh w-screen overflow-hidden bg-shell" style={tutorialOpen ? { height: `calc(100dvh - ${tutorialHeight}px)` } : undefined}>
      <AppSidebar tutorialStep={tutorialStep} onTutorial={() => { setTutorialHeight(0); setTutorialStep(0); }} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <QuizNotice />
        <Workspace tutorialStep={tutorialStep} />
      </div>
      {tutorialOpen && <InterfaceTutorial index={tutorialStep} onDockHeight={setTutorialHeight} onStepChange={setTutorialStep} onClose={() => setTutorialStep(null)} />}
    </div>
  );
}
