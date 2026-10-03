import type { ReactNode } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';

/** Accessible form dialog in the existing ICESI visual language. */
export function Modal({ open, title, onClose, children, busy = false }: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !busy) onClose(); }} disablePointerDismissal>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <Dialog.Popup className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain border border-border bg-card text-foreground outline-none">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <Dialog.Title className="text-[16px] font-semibold">{title}</Dialog.Title>
              <button type="button" onClick={onClose} disabled={busy} aria-label="Cerrar diálogo"
                className="p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50">
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
