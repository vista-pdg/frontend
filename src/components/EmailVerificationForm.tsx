import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { VerificationResponse } from '@/types/auth';

interface Props {
  email: string;
  receipt: VerificationResponse;
  code: string;
  loading: boolean;
  error?: string;
  generalError: string | null;
  onCode: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onResend: () => void;
  onBack: () => void;
}

export function EmailVerificationForm({ email, receipt, code, loading, error, generalError, onCode, onSubmit, onResend, onBack }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    input.current?.focus();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [receipt.verificationId]);
  const seconds = Math.max(0, Math.ceil((Date.parse(receipt.resendAvailableAt) - now) / 1000));
  const expires = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' }).format(new Date(receipt.expiresAt));
  const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
  return (
    <section className="flex flex-col gap-6" data-cy="email-verification" aria-labelledby="verification-title">
      <p className="text-xs font-medium text-primary-light">Paso 2 de 2 · Correo institucional</p>
      <div className="flex flex-col gap-2">
        <h1 id="verification-title" className="text-2xl font-semibold tracking-tight text-foreground">Verifica tu correo</h1>
        <p className="break-words text-sm leading-relaxed text-muted-foreground">
          Enviamos un código a <strong className="font-medium text-foreground">{email}</strong>. Introdúcelo para crear tu cuenta.
        </p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" aria-busy={loading}>
        <div className="flex flex-col gap-2">
          <label htmlFor="verificationCode" className="text-[13px] font-medium text-foreground">Código de verificación</label>
          <input ref={input} id="verificationCode" name="verificationCode" type="text" inputMode="numeric" autoComplete="one-time-code"
            value={code} onChange={event => onCode(event.target.value)} maxLength={6} pattern="[0-9]{6}" required spellCheck={false}
            aria-invalid={!!error} aria-describedby={`verification-help${error ? ' verification-error' : ''}`} data-cy="input-verificationCode"
            className={`w-full border bg-shell px-3 py-3 text-xl tracking-[0.25em] text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${error ? 'border-destructive' : 'border-border'}`} />
          <p id="verification-help" className="text-xs text-muted-foreground">6 dígitos. Vence a las {expires}. Revisa también spam.</p>
          {error && <p id="verification-error" role="alert" data-cy="field-error-verificationCode" className="text-xs text-foreground">{error}</p>}
        </div>
        {generalError && <div role="alert" data-cy="error-banner" className="flex items-start gap-2.5 border border-destructive/30 bg-destructive/10 p-3">
          <AlertCircle aria-hidden="true" className="mt-px size-4 shrink-0 text-destructive" />
          <p className="text-xs leading-relaxed text-foreground">{generalError}</p>
        </div>}
        <button type="submit" data-cy="submit" disabled={loading || !/^\d{6}$/.test(code)}
          className={`flex w-full items-center justify-center gap-2 bg-primary py-3 text-[13px] font-semibold text-primary-foreground hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40 ${focus}`}>
          {loading && <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}
          {loading ? 'Procesando…' : 'Verificar y crear cuenta'}
        </button>
      </form>
      <button type="button" data-cy="resend-code" onClick={onResend} disabled={loading || seconds > 0}
        className={`min-h-10 text-sm text-primary-light hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline ${focus}`}>
        {seconds > 0 ? `Reenviar código en ${seconds} s` : 'Reenviar código'}
      </button>
      <button type="button" data-cy="back-to-register" disabled={loading} onClick={onBack}
        className={`min-h-10 text-sm text-primary-light hover:underline disabled:opacity-40 ${focus}`}>
        Volver al registro
      </button>
    </section>
  );
}
