import { useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';

const SAMPLE = {
  pseudocode: ['mientras pila no esté vacía:', '  tope ← pila.cima()', '  pila.retirar() // pop', 'fin'],
  java: ['while (!pila.isEmpty()) {', '  int tope = pila.peek();', '  pila.pop();', '}'],
};
const STAGES = ['Pila inicial: 3 y 42', 'Leer el tope: 42', 'Retirar 42 de la pila'];

/** Presentation-only example: never reads or writes the application engine. */
export function TutorialCodeDemo({ style }: { style: CSSProperties }) {
  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState<'pseudocode' | 'java'>('pseudocode');
  return (
    <section data-cy="tutorial-code-demo" aria-label="Demo de código de la guía" style={style}
      className="absolute overflow-y-auto border border-border bg-card p-3 text-foreground">
      <h3 className="text-sm font-semibold">Demo de la guía</h3>
      <p className="mt-1 text-xs text-muted-foreground">Ejemplo de pila · tu sesión no cambia</p>
      <div className="my-3 flex items-center gap-2" aria-label={step < 2 ? 'Pila con 3 y 42; 42 es el tope' : 'Pila con 3; se retiró 42'}>
        <span className="text-xs text-muted-foreground">Pila</span>
        {[3, 42].map(value => <span key={value} data-cy={`tutorial-node-${value}`}
          className={cn('border px-3 py-2 font-mono text-sm', value === 42 && step === 1 ? 'border-orange-main bg-orange-main/15 text-annotation-orange' : value === 42 && step === 2 ? 'border-border text-muted-foreground line-through' : 'border-primary/50 text-primary-light')}>
          {value}{value === 42 && step === 1 ? ' ← tope' : value === 42 && step === 2 ? ' retirado' : ''}
        </span>)}
      </div>
      <div role="group" aria-label="Representación de código de ejemplo" className="mb-2 flex gap-1">
        {(['pseudocode', 'java'] as const).map(id => <button key={id} type="button" data-cy={`tutorial-code-${id}`} aria-pressed={language === id} onClick={() => setLanguage(id)}
          className={cn('px-2 py-1.5 text-xs hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring', language === id ? 'bg-primary text-primary-foreground hover:bg-primary-dark' : 'text-muted-foreground')}>
          {id === 'java' ? 'Java' : 'Pseudocódigo'}
        </button>)}
      </div>
      <ol aria-label="Código de ejemplo" className="overflow-x-auto border border-border bg-shell py-2 font-mono text-xs leading-6" translate="no">
        {SAMPLE[language].map((line, index) => <li key={index} data-cy={`tutorial-code-line-${index + 1}`} data-active={index === step} aria-current={index === step ? 'step' : undefined}
          className={cn('flex min-w-max gap-3 border-l-2 px-2 whitespace-pre', index === step ? 'border-primary bg-primary/15 font-semibold text-foreground' : 'border-transparent text-code-text')}>
          <span aria-hidden="true" className="w-3 shrink-0 text-muted-foreground">{index + 1}</span><code>{line}</code>
        </li>)}
      </ol>
      <p data-cy="tutorial-demo-step" aria-live="polite" className="my-3 text-xs text-muted-foreground">{step + 1} / 3 · {STAGES[step]}</p>
      <div className="flex gap-2">
        <button type="button" data-cy="tutorial-demo-prev" disabled={step === 0} onClick={() => setStep(value => value - 1)} className="border border-border px-3 py-2 text-xs disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring">Paso anterior</button>
        <button type="button" data-cy="tutorial-demo-next" disabled={step === 2} onClick={() => setStep(value => value + 1)} className="border border-border px-3 py-2 text-xs disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring">Paso siguiente</button>
      </div>
    </section>
  );
}
