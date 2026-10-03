import { useRef, useState } from 'react';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import { Alert } from './alert';

/** Shared destructive confirmation. Keep it mounted until the request succeeds or is cancelled. */
export function ConfirmationDialog({ open, title, description, target, confirmLabel, onConfirm, onClose, restoreFocus }: {
  open: boolean;
  title: string;
  description: string;
  target: { name: string; detail?: string } | null;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  restoreFocus: () => HTMLElement | null;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setError(null);
    onClose();
  }

  async function confirmAction() {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      await onConfirm();
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la acción. Inténtalo de nuevo.');
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !submitting.current) close(); }}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/60" />
        <AlertDialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <AlertDialog.Popup initialFocus={cancelRef} finalFocus={restoreFocus}
            data-cy="confirmation-dialog"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain border border-border bg-card p-6 text-foreground outline-none">
            <AlertDialog.Title className="text-[18px] font-semibold">{title}</AlertDialog.Title>
            <AlertDialog.Description className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{description}</AlertDialog.Description>
            <div className="my-4 min-w-0 break-words bg-muted p-3">
              <p className="text-[14px] font-medium">{target?.name}</p>
              {target?.detail && <p className="mt-1 break-all text-[12px] text-muted-foreground">{target.detail}</p>}
            </div>
            {error && <Alert className="mb-4">{error}</Alert>}
            <div className="flex flex-wrap gap-3" aria-busy={pending}>
              <button type="button" ref={cancelRef} onClick={close} disabled={pending} data-cy="confirmation-cancel"
                className="min-h-10 flex-1 border border-border px-3 py-2 text-[13px] font-semibold transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50">
                Cancelar
              </button>
              <button type="button" onClick={() => void confirmAction()} disabled={pending} data-cy="confirmation-submit"
                className="min-h-10 flex-1 bg-destructive px-3 py-2 text-[13px] font-semibold text-destructive-foreground transition-colors hover:brightness-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50">
                {pending ? 'Eliminando…' : confirmLabel}
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
