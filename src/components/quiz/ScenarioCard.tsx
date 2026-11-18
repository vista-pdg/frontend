import { FlaskConical, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGraphStore } from '@/store/graphStore';
import { MicroLabel } from './QuizPageShell';
import type { VistaSetup } from '@/types/quiz';

/**
 * Escenario de una pregunta y cómo llevarlo a VISTA sin teclearlo (HU-35 · CA-1). En el modo de
 * prueba no se puede pegar, así que «Insertar en el chat» escribe la instrucción —validada por el
 * servidor— en el campo del chat, sin enviarla, y «Cargar en Algoritmos» deja el algoritmo con sus
 * valores. Las preguntas anteriores a HU-35 no traen preparación y se muestran sin botones.
 */
export function ScenarioCard({ scenario, setup, position, onReveal }: {
  scenario: string;
  setup: VistaSetup | null;
  position: number;
  /** En móvil, cambia a la pestaña donde quedó lo insertado. */
  onReveal?: () => void;
}) {
  const prefillChat = useGraphStore((s) => s.prefillChat);
  const prefillAlgorithm = useGraphStore((s) => s.prefillAlgorithm);
  const origin = `la pregunta ${position}`;

  function insertInChat() {
    if (!setup?.chatPrompt) return;
    prefillChat(setup.chatPrompt, setup.structureType, setup.structureSubtype, `Insertado desde ${origin}. Revísalo y pulsa Enter para enviar.`);
    // Operación sobre el lienzo: el algoritmo queda elegido, con su valor, para cuando se abra.
    if (!setup.values) {
      prefillAlgorithm({ key: setup.algorithm, values: null, argument: setup.argument, source: 'canvas', note: `Preparado desde ${origin}: genera la estructura con el chat y pulsa Ejecutar.` }, false);
    }
    onReveal?.();
  }

  function loadInAlgorithms() {
    if (!setup?.values) return;
    prefillAlgorithm({ key: setup.algorithm, values: setup.values, argument: setup.argument, source: 'values', note: `Cargado desde ${origin}. Pulsa Ejecutar.` }, true);
    onReveal?.();
  }

  const chat = Boolean(setup?.chatPrompt);
  const values = Boolean(setup?.values?.length);
  return (
    <div className="space-y-2.5 border-l-2 border-annotation-yellow bg-shell p-3" data-cy="quiz-scenario-card">
      <MicroLabel>Escenario para reproducir en VISTA</MicroLabel>
      <p className="text-[13px] leading-relaxed break-words" data-cy="quiz-scenario">{scenario}</p>
      {(chat || values) && (
        <div className="flex flex-wrap gap-2">
          {chat && (
            <Button type="button" variant="outline" onClick={insertInChat} data-cy="scenario-insert-chat" className="min-h-11 px-3 text-[12px] max-sm:w-full">
              <MessageSquarePlus aria-hidden="true" />Insertar en el chat
            </Button>
          )}
          {values && (
            <Button type="button" variant="outline" onClick={loadInAlgorithms} data-cy="scenario-load-algorithm" className="min-h-11 px-3 text-[12px] max-sm:w-full">
              <FlaskConical aria-hidden="true" />Cargar en Algoritmos
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
