import { useEffect, useRef, useState } from 'react';
import { TutorialCodeDemo } from './TutorialCodeDemo';

const STEPS = [
  { title: 'Elige una estructura', description: 'La selección de esta barra define el contexto del chat y los algoritmos. Abre «Árboles» para elegir AVL o BST.', targets: ['[data-cy=nav-family-tree]'] },
  { title: 'Describe desde el chat', description: 'Escribe aquí valores u operaciones de la estructura seleccionada. VISTA atiende consultas de estructuras y algoritmos.', targets: ['[data-cy=chat-compose]'] },
  { title: 'Ejecuta un algoritmo', description: 'Elige una operación compatible y genera la demo. Después recorre el lienzo con Anterior, Siguiente o Reproducir.', targets: ['[data-cy=algo-form]', '[data-cy=algo-catalog]'] },
  { title: 'Lee el código del paso', description: 'La línea resaltada corresponde al paso visual. Alterna Java y pseudocódigo y recorre los pasos para ver la relación. Si aún no hay código en tu sesión, aquí aparece un ejemplo de pila. También puedes copiar o descargar el código de tus demos.', targets: ['[data-cy=code-panel]', '[data-cy=tutorial-demo-area]'] },
  { title: 'Cambia la vista', description: 'Estos controles alternan 2D y 3D conservando la estructura y el paso. El tema claro u oscuro está en la barra lateral.', targets: ['[data-cy=mode-selector]'] },
] as const;

type Rect = { left: number; top: number; width: number; height: number };
type Placement = { index: number; target: Rect; demo: Rect | null; selector: string; card: { left: number; top: number } };

/** Clip a spotlight to the viewport and any scrolling ancestors. */
function visibleRect(element: HTMLElement): Rect {
  const rect = element.getBoundingClientRect();
  let left = Math.max(0, rect.left), top = Math.max(0, rect.top);
  let right = Math.min(innerWidth, rect.right), bottom = Math.min(innerHeight, rect.bottom);
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    const bounds = parent.getBoundingClientRect();
    if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
    if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
  }
  return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

export function InterfaceTutorial({ index, onDockHeight, onStepChange, onClose }: { index: number; onDockHeight: (height: number) => void; onStepChange: (index: number) => void; onClose: () => void }) {
  const returnFocus = useRef<HTMLElement | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const step = STEPS[index];

  useEffect(() => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const current = dialog.current;
    current?.showModal();
    const frame = requestAnimationFrame(() => next.current?.focus());
    return () => { cancelAnimationFrame(frame); current?.close(); };
  }, []);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      const selector = step.targets.find(selector => {
        const el = document.querySelector<HTMLElement>(selector);
        if (!el) return false;
        const bounds = visibleRect(el);
        return bounds.width > 0 && bounds.height > 0;
      });
      const element = selector ? document.querySelector<HTMLElement>(selector) : null;
      if (!element || !card.current || !selector) return;
      const target = visibleRect(element);
      const rect = element.getBoundingClientRect();
      const { width, height } = card.current.getBoundingClientRect();
      const gap = 20, margin = 12;
      const clampX = (x: number) => Math.max(margin, Math.min(x, innerWidth - width - margin));
      const clampY = (y: number) => Math.max(margin, Math.min(y, innerHeight - height - margin));
      const areaBottom = document.querySelector('[data-cy=application-area]')?.getBoundingClientRect().bottom ?? innerHeight;
      let position: { left: number; top: number };
      let reserved = 0;
      if (target.left + target.width + gap + width <= innerWidth - margin) {
        position = { left: target.left + target.width + gap, top: clampY(target.top) };
      } else if (target.left - gap - width >= margin) {
        position = { left: target.left - gap - width, top: clampY(target.top) };
      } else if (target.top + target.height + gap + height <= areaBottom - margin) {
        position = { left: clampX(target.left), top: target.top + target.height + gap };
      } else if (target.top - gap - height >= margin) {
        position = { left: clampX(target.left), top: target.top - gap - height };
      } else {
        reserved = Math.ceil(height + 2 * margin);
        position = { left: clampX(target.left), top: innerHeight - height - margin };
      }
      onDockHeight(reserved);
      setPlacement({ index, target, card: position, demo: selector === '[data-cy=tutorial-demo-area]' ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null, selector });
      if (document.activeElement === dialog.current) next.current?.focus();
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    for (const selector of step.targets) {
      const element = document.querySelector(selector);
      if (element) observer.observe(element);
    }
    if (card.current) observer.observe(card.current);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    schedule();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', schedule); window.removeEventListener('scroll', schedule, true); };
  }, [index, step, onDockHeight]);

  function close() {
    dialog.current?.close();
    const trigger = returnFocus.current;
    onClose();
    requestAnimationFrame(() => trigger?.focus());
  }

  const current = placement?.index === index ? placement : null;
  const target = current?.target;

  return (
    <dialog ref={dialog} onCancel={event => { event.preventDefault(); close(); }} aria-labelledby="tutorial-title" aria-describedby="tutorial-description" data-cy="tutorial"
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 text-foreground backdrop:bg-transparent">
      {current?.demo && <TutorialCodeDemo style={current.demo} />}
      {target && <div aria-hidden="true" data-cy="tutorial-highlight" data-target={current?.selector} className="pointer-events-none absolute" style={target}>
        {['-left-1.5 -top-1.5 border-l-2 border-t-2', '-right-1.5 -top-1.5 border-r-2 border-t-2', '-left-1.5 -bottom-1.5 border-l-2 border-b-2', '-right-1.5 -bottom-1.5 border-r-2 border-b-2'].map(position => (
          <span key={position} data-cy="tutorial-corner" className={`absolute size-3 border-primary ${position}`} />
        ))}
      </div>}
      <div ref={card} data-cy="tutorial-callout" style={current?.card ?? { left: 12, top: 12, visibility: 'hidden' }} className="absolute w-[360px] max-w-[calc(100vw_-_1.5rem)] max-h-[45dvh] overflow-y-auto border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-4">
        <div className="min-w-0 flex-1">
        <p className="mb-2 text-xs text-muted-foreground" aria-live="polite">Guía de VISTA · {index + 1} / {STEPS.length}</p>
        <h2 id="tutorial-title" className="mb-2 text-base font-semibold">{step.title}</h2>
        <p id="tutorial-description" className="text-sm leading-relaxed">{step.description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" data-cy="tutorial-prev" disabled={index === 0} onClick={() => onStepChange(index - 1)} className="border border-border px-3 py-2 text-xs disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring">Anterior</button>
          <button ref={next} type="button" data-cy="tutorial-next" onClick={() => index === STEPS.length - 1 ? close() : onStepChange(index + 1)} className="bg-primary px-3 py-2 text-xs text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring">{index === STEPS.length - 1 ? 'Terminar' : 'Siguiente'}</button>
          <button type="button" data-cy="tutorial-close" onClick={close} className="ml-auto px-3 py-2 text-xs focus-visible:outline-2 focus-visible:outline-ring">Salir</button>
        </div>
        </div>
      </div>
    </dialog>
  );
}
