import { EmailVerificationForm } from '@/components/EmailVerificationForm';
import { IcesiBrand } from '@/components/IcesiBrand';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronDown, Eye, EyeOff, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/http';
import { useAuth } from '@/contexts/useAuth';
import { GraphMotif } from '@/components/GraphMotif';
import { login as loginRequest, register as registerRequest, requestRegistrationCode } from '@/services/authService';
import { fetchCourses } from '@/services/courseService';
import type { CourseDto, VerificationResponse } from '@/types/auth';

type Mode = 'login' | 'register';

const EMPTY_FORM = {
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
  courseCode: '',
};

export function WelcomePage() {
  const { refreshFromStorage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [verification, setVerification] = useState<VerificationResponse | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isRegister = mode === 'register';

  // Cursos del periodo activo. null = todavía no cargados; [] = cargados pero no hay ninguno.
  const [courses, setCourses] = useState<CourseDto[] | null>(null);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  function loadCourses() {
    setCoursesError(null);
    setCourses(null);
    fetchCourses()
      .then(setCourses)
      .catch((err: unknown) => {
        setCourses([]);
        setCoursesError(
          err instanceof Error ? err.message : 'No se pudieron cargar los cursos'
        );
      });
  }


  function switchMode(next: Mode) {
    if (next === mode || loading) return;
    setVerification(null);
    setVerificationCode('');
    setMode(next);
    // Los cursos se piden la primera vez que el usuario abre el registro, no al montar: quien sólo
    // va a iniciar sesión no necesita esa petición. Hacerlo aquí y no en un efecto evita un
    // setState síncrono dentro de useEffect.
    if (next === 'register' && courses === null && coursesError === null) loadCourses();
    setGeneralError(null);
    setFieldErrors({});
    setShowPassword(false);
  }

  function update(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    // Limpia el error del campo en cuanto se corrige, para no dejarlo marcado en rojo mientras el
    // usuario ya está arreglándolo.
    if (fieldErrors[field]) {
      setFieldErrors((e) => {
        const next = { ...e };
        delete next[field];
        return next;
      });
    }
  }

  const canSubmit = isRegister
    ? form.displayName.trim() &&
      form.email.trim() &&
      form.courseCode &&
      form.password &&
      form.confirmPassword
    : form.email.trim() && form.password;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setGeneralError(null);
    setFieldErrors({});

    try {
      const payload = { ...form, displayName: form.displayName.trim(), email: form.email.trim() };
      if (isRegister && !verification) {
        setVerification(await requestRegistrationCode(payload));
        setVerificationCode('');
        setShowPassword(false);
        return;
      }
      const res = isRegister && verification
        ? await registerRequest({ ...payload, verificationId: verification.verificationId, verificationCode })
        : await loginRequest(payload.email, form.password);

      refreshFromStorage();

      // CA-3: al docente le corresponde el panel analítico. Si venía de una ruta protegida, se
      // respeta su destino original.
      const from = (location.state as { from?: string } | null)?.from;
      const home = res.roles.includes('TEACHER') ? '/analytics' : '/';
      navigate(from ?? home, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
        const firstField = [...Object.keys(EMPTY_FORM), 'verificationCode'].find((name) => err.fieldErrors[name]);
        if (Object.keys(EMPTY_FORM).some(name => err.fieldErrors[name])) setVerification(null);
        if (firstField) requestAnimationFrame(() => document.getElementById(firstField)?.focus());
        // Si el error ya está señalado campo a campo, un banner encima sería ruido duplicado.
        setGeneralError(Object.keys(err.fieldErrors).length > 0 ? null : err.message);
      } else {
        setGeneralError(err instanceof Error ? err.message : 'Error desconocido');
      }
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (loading || !verification) return;
    setLoading(true);
    setGeneralError(null);
    try {
      const receipt = await requestRegistrationCode({ ...form, displayName: form.displayName.trim(), email: form.email.trim() });
      setVerification(receipt);
      setVerificationCode('');
      setFieldErrors({});
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'No pudimos reenviar el código.');
      if (err instanceof ApiError && err.retryAfterSeconds) {
        setVerification(previous => previous && ({ ...previous, resendAvailableAt: new Date(Date.now() + err.retryAfterSeconds! * 1000).toISOString() }));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background" data-cy="welcome-screen">
      <a href="#auth-main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-30 focus:bg-shell focus:p-3 focus:text-foreground">
        Ir al formulario
      </a>
      <header className="flex h-20 shrink-0 items-center justify-between border-b border-border bg-shell px-6 lg:px-12">
        <IcesiBrand />
        <ThemeToggle />
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-1/2 shrink-0 flex-col justify-between gap-8 overflow-y-auto bg-shell p-12 lg:flex xl:p-16" aria-label="Acerca del visualizador">
          <div className="flex flex-col gap-6">
            <p className="text-xs font-medium tracking-[0.1em] text-primary-light">VISUALIZADOR DE ESTRUCTURAS</p>
            <h2 className="max-w-[480px] text-4xl font-semibold leading-[1.2] tracking-tight text-balance text-foreground">
              Comprende cada paso.<br />Explora en 2D y 3D.
            </h2>
            <p className="max-w-[480px] text-[15px] leading-relaxed text-muted-foreground">
              Construye estructuras, sigue sus algoritmos y consulta el código con el apoyo del chat.
            </p>
          </div>
          <GraphMotif className="w-full max-w-[592px] shrink-0" />
          <p className="text-xs text-muted-foreground">Computación y estructuras discretas I</p>
        </aside>
        <main id="auth-main" tabIndex={-1} className="flex min-w-0 flex-1 flex-col overflow-y-auto scrollbar-custom px-6 py-8 lg:border-l lg:border-border lg:px-12 lg:py-12">
          <div className="mx-auto my-auto flex w-full max-w-[400px] shrink-0 flex-col gap-6">
            {verification ? (
              <EmailVerificationForm email={form.email.trim()} receipt={verification} code={verificationCode}
                loading={loading} error={fieldErrors.verificationCode} generalError={generalError}
                onSubmit={handleSubmit} onResend={resendCode}
                onCode={value => { setVerificationCode(value); setFieldErrors(previous => { const next = { ...previous }; delete next.verificationCode; return next; }); }}
                onBack={() => { setVerification(null); setVerificationCode(''); setFieldErrors({}); setGeneralError(null); setShowPassword(false); requestAnimationFrame(() => document.getElementById('email')?.focus()); }} />
            ) : (
              <>
            <div className="flex items-end gap-6 border-b border-border" role="tablist" aria-label="Acceso a la cuenta">
              <Tab
                label="Ingresar"
                active={!isRegister}
                onClick={() => switchMode('login')}
                dataCy="tab-login"
                disabled={loading}
              />
              <Tab
                label="Crear cuenta"
                active={isRegister}
                onClick={() => switchMode('register')}
                dataCy="tab-register"
                disabled={loading}
              />
            </div>

            <section id="auth-panel" role="tabpanel" aria-labelledby={`tab-${mode}`} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {isRegister ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {isRegister
                    ? 'Usa tu correo institucional y selecciona tu curso.'
                    : 'Ingresa con tu correo institucional para continuar.'}
                </p>
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-busy={loading} noValidate>
                {isRegister && (
                  <Field
                    label="Nombre completo"
                    name="displayName"
                    value={form.displayName}
                    onChange={(v) => update('displayName', v)}
                    placeholder="Tu nombre completo"
                    autoComplete="name"
                    error={fieldErrors.displayName}
                  />
                )}

                <Field
                  label="Correo institucional"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={(v) => update('email', v)}
                  placeholder="nombre@u.icesi.edu.co"
                  autoComplete="email"
                  hint={isRegister ? '@u.icesi.edu.co o @icesi.edu.co' : undefined}
                  error={fieldErrors.email}
                />

                {isRegister && (
                  <SelectField
                    label="Curso"
                    name="courseCode"
                    value={form.courseCode}
                    onChange={(v) => update('courseCode', v)}
                    options={courses ?? []}
                    loading={courses === null && coursesError === null}
                    loadError={coursesError}
                    onRetry={loadCourses}
                    error={fieldErrors.courseCode}
                  />
                )}

                <Field
                  label="Contraseña"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(v) => update('password', v)}
                  placeholder="••••••••"
                  hint={isRegister ? 'Mínimo 8 caracteres.' : undefined}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  error={fieldErrors.password}
                  trailing={
                    <button
                      type="button"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowPassword((p) => !p)}
                      className="flex size-10 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring transition-colors duration-150"
                    >
                      {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                    </button>
                  }
                />

                {isRegister && (
                  <Field
                    label="Confirmar contraseña"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(v) => update('confirmPassword', v)}
                    placeholder="Repite la contraseña"
                    autoComplete="new-password"
                    error={fieldErrors.confirmPassword}
                  />
                )}

                {isRegister && (
                  <div className="flex items-start gap-2.5 border-l-2 border-primary/40 pl-3">
                    <Info aria-hidden="true" className="size-3.5 shrink-0 text-primary-light mt-px" />
                    <p className="text-[12px] leading-[1.5] text-muted-foreground">
                      Tu cuenta de estudiante quedará vinculada al curso y al periodo activo.
                      Un administrador asigna el rol docente.
                    </p>
                  </div>
                )}

                {generalError && (
                  <div
                    data-cy="error-banner"
                    role="alert"
                    className="flex items-start gap-2.5 border border-destructive/30 bg-destructive/10 p-3"
                  >
                    <AlertCircle aria-hidden="true" className="size-3.5 shrink-0 text-destructive mt-px" />
                    <p className="text-[12px] leading-[1.5] text-foreground dark:text-red-400">{generalError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  data-cy="submit"
                  disabled={!canSubmit || loading}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 bg-primary py-3 text-[13px] font-semibold text-primary-foreground',
                    'transition-colors duration-150 hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary'
                  )}
                >
                  {loading && <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}
                  {loading
                    ? isRegister
                      ? 'Enviando código…'
                      : 'Autenticando…'
                    : isRegister
                      ? 'Enviar código'
                      : 'Ingresar'}
                </button>
              </form>

              <p className="text-center text-[12px] text-muted-foreground">
                {isRegister ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}{' '}
                <button
                  type="button"
                  data-cy={isRegister ? 'link-to-login' : 'link-to-register'}
                  onClick={() => switchMode(isRegister ? 'login' : 'register')}
                  className="font-semibold text-primary-light hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {isRegister ? 'Ingresar' : 'Crear cuenta'}
                </button>
              </p>
            </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function Tab({
  label,
  active,
  onClick,
  dataCy,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  dataCy: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={dataCy}
      aria-controls="auth-panel"
      tabIndex={active ? 0 : -1}
      onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const tabs = Array.from(event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
        const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.indexOf(event.currentTarget) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        tabs[index].focus();
        tabs[index].click();
      }}
      aria-selected={active}
      disabled={disabled}
      data-cy={dataCy}
      onClick={onClick}
      className={cn(
        'min-h-11 pb-3 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        active
          ? 'border-b-2 border-primary font-semibold text-primary-light'
          : 'border-b-2 border-transparent font-medium text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
    </button>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  loading,
  loadError,
  onRetry,
  error,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: CourseDto[];
  loading: boolean;
  loadError: string | null;
  onRetry: () => void;
  error?: string;
}) {
  const errorId = `${name}-error`;
  const empty = !loading && options.length === 0;
  const placeholder = loading
    ? 'Cargando cursos…'
    : empty
      ? 'No hay cursos en el periodo activo'
      : 'Selecciona tu curso';
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={name}
        className="text-[13px] font-medium text-foreground"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading || empty}
          data-cy={`select-${name}`}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'w-full appearance-none bg-shell px-3 py-[11px] pr-10 text-sm',
            'border transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            'disabled:cursor-not-allowed disabled:opacity-60',
            value ? 'text-foreground' : 'text-muted-foreground',
            error ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary/70'
          )}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((c) => (
            <option key={c.code} value={c.code} className="bg-shell text-foreground">
              {c.code} · {c.name}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {loadError && (
        <p data-cy="courses-load-error" role="alert" className="text-[11px] text-foreground dark:text-red-400">
          {loadError}{' '}
          <button type="button" onClick={onRetry} className="font-semibold text-primary-light hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Reintentar
          </button>
        </p>
      )}
      {error && (
        <p id={errorId} data-cy={`field-error-${name}`} role="alert" className="text-[11px] text-foreground dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoComplete,
  error,
  trailing,
  hint,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  error?: string;
  trailing?: React.ReactNode;
  hint?: string;
}) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={name}
        className="text-[13px] font-medium text-foreground"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          data-cy={`input-${name}`}
          aria-invalid={!!error}
          aria-describedby={[error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined}
          spellCheck={type === 'email' ? false : undefined}
          className={cn(
            'w-full bg-shell px-3 py-[11px] text-sm text-foreground placeholder:text-muted-foreground',
            'border transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            trailing && 'pr-10',
            error ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary/70'
          )}
        />
        {trailing && (
          <span className="absolute right-1 top-1/2 -translate-y-1/2">{trailing}</span>
        )}
      </div>
      {hint && <p id={hintId} className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={errorId} data-cy={`field-error-${name}`} role="alert" className="text-[11px] text-foreground dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
