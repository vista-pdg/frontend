import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronDown, Eye, EyeOff, Info, Loader2, Network } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/http';
import { useAuth } from '@/contexts/AuthContext';
import { GraphMotif } from '@/components/GraphMotif';
import { login as loginRequest, register as registerRequest } from '@/services/authService';
import { fetchCourses } from '@/services/courseService';
import type { CourseDto } from '@/types/auth';

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
    if (next === mode) return;
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
      const res = isRegister
        ? await registerRequest({
            displayName: form.displayName.trim(),
            email: form.email.trim(),
            password: form.password,
            confirmPassword: form.confirmPassword,
            courseCode: form.courseCode,
          })
        : await loginRequest(form.email.trim(), form.password);

      refreshFromStorage();

      // CA-3: al docente le corresponde el panel analítico. Si venía de una ruta protegida, se
      // respeta su destino original.
      const from = (location.state as { from?: string } | null)?.from;
      const home = res.roles.includes('TEACHER') ? '/analytics' : '/';
      navigate(from ?? home, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
        // Si el error ya está señalado campo a campo, un banner encima sería ruido duplicado.
        setGeneralError(Object.keys(err.fieldErrors).length > 0 ? null : err.message);
      } else {
        setGeneralError(err instanceof Error ? err.message : 'Error desconocido');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black-main" data-cy="welcome-screen">
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-primary z-10" />

      {/* Panel de marca */}
      <aside className="hidden lg:flex flex-col justify-between w-[58%] max-w-[835px] shrink-0 bg-black-main px-18 py-18">
        <div className="flex flex-col gap-14">
          <div className="flex items-center gap-3.5">
            <div className="size-11 bg-primary flex items-center justify-center shrink-0">
              <Network className="size-[22px] text-white" />
            </div>
            <div className="flex flex-col gap-[3px]">
              <span className="text-[22px] font-bold tracking-[0.28em] text-white uppercase leading-none">
                VISTA
              </span>
              <span className="text-[10px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
                Visualizador 3D · PDG-I
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <h1 className="text-[46px] font-bold leading-[1.15] tracking-[-0.02em] text-white">
              Estructuras discretas,
              <br />
              en tres dimensiones.
            </h1>
            <p className="max-w-[520px] text-[15px] leading-[1.65] text-muted-foreground">
              Describe un grafo, un árbol AVL o una tabla hash en lenguaje natural y obsérvalo
              construirse en el espacio. Crea tu cuenta para guardar tu historial de estructuras.
            </p>
          </div>
        </div>

        <GraphMotif className="w-full max-w-[691px] h-[250px]" />

        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Universidad Icesi
          </span>
          <span className="size-[3px] bg-border" />
          <span className="text-[11px] text-muted-foreground">
            Computación y estructuras discretas I
          </span>
        </div>
      </aside>

      {/* Panel de autenticación */}
      <main className="flex flex-1 flex-col justify-center overflow-y-auto scrollbar-custom border-l border-border bg-background px-8 py-18 lg:px-17">
        <div className="mx-auto flex w-full max-w-[469px] flex-col gap-7">
          {/* Marca compacta, sólo cuando el panel izquierdo no cabe */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="size-9 bg-primary flex items-center justify-center shrink-0">
              <Network className="size-[18px] text-white" />
            </div>
            <span className="text-[18px] font-bold tracking-[0.28em] text-white uppercase">
              VISTA
            </span>
          </div>

          <div className="flex items-end gap-7" role="tablist">
            <Tab
              label="Ingresar"
              active={!isRegister}
              onClick={() => switchMode('login')}
              dataCy="tab-login"
            />
            <Tab
              label="Crear cuenta"
              active={isRegister}
              onClick={() => switchMode('register')}
              dataCy="tab-register"
            />
            <span className="flex-1 border-b border-border self-stretch" />
          </div>

          <p className="text-[13px] leading-[1.6] text-muted-foreground">
            {isRegister
              ? 'Registra tu cuenta institucional para guardar el historial de estructuras que generes.'
              : 'Accede con tu correo institucional para retomar tus estructuras.'}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            {isRegister && (
              <Field
                label="Nombre completo"
                name="displayName"
                value={form.displayName}
                onChange={(v) => update('displayName', v)}
                placeholder="Ana María Restrepo"
                autoComplete="name"
                error={fieldErrors.displayName}
              />
            )}

            <Field
              label="Correo electrónico"
              name="email"
              type="email"
              value={form.email}
              onChange={(v) => update('email', v)}
              placeholder="nombre@u.icesi.edu.co"
              autoComplete="email"
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
              placeholder={isRegister ? 'Mínimo 8 caracteres' : '••••••••'}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              error={fieldErrors.password}
              trailing={
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword((p) => !p)}
                  className="text-muted-foreground hover:text-white transition-colors duration-150"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
              <div className="flex items-start gap-2.5 border border-primary/25 bg-primary/[0.08] p-3">
                <Info className="size-3.5 shrink-0 text-primary-light mt-px" />
                <p className="text-[12px] leading-[1.5] text-muted-foreground">
                  Tu cuenta se crea con rol Estudiante y queda vinculada al curso y al periodo
                  académico activo. El rol Docente lo asigna un administrador.
                </p>
              </div>
            )}

            {generalError && (
              <div
                data-cy="error-banner"
                role="alert"
                className="flex items-start gap-2.5 border border-destructive/30 bg-destructive/10 p-3"
              >
                <AlertCircle className="size-3.5 shrink-0 text-destructive mt-px" />
                <p className="text-[12px] leading-[1.5] text-red-400">{generalError}</p>
              </div>
            )}

            <button
              type="submit"
              data-cy="submit"
              disabled={!canSubmit || loading}
              className={cn(
                'flex w-full items-center justify-center gap-2 bg-primary py-3 text-[13px] font-semibold text-white',
                'transition-colors duration-150 hover:bg-primary-dark',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary'
              )}
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading
                ? isRegister
                  ? 'Creando cuenta…'
                  : 'Autenticando…'
                : isRegister
                  ? 'Crear cuenta'
                  : 'Ingresar'}
            </button>
          </form>

          <p className="text-center text-[12px] text-muted-foreground">
            {isRegister ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}{' '}
            <button
              type="button"
              data-cy={isRegister ? 'link-to-login' : 'link-to-register'}
              onClick={() => switchMode(isRegister ? 'login' : 'register')}
              className="font-semibold text-primary-light hover:underline"
            >
              {isRegister ? 'Ingresar' : 'Crear cuenta'}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

function Tab({
  label,
  active,
  onClick,
  dataCy,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  dataCy: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-cy={dataCy}
      onClick={onClick}
      className={cn(
        'pb-3 text-[13px] transition-colors duration-150',
        active
          ? 'border-b-2 border-primary font-semibold text-primary-light'
          : 'border-b border-border font-medium text-muted-foreground hover:text-white'
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
        className="text-[11px] font-medium uppercase tracking-[0.13em] text-muted-foreground"
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
            'w-full appearance-none bg-black-main px-3 py-[11px] pr-10 text-[13px]',
            'border transition-colors duration-150 focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-60',
            value ? 'text-white' : 'text-muted-foreground',
            error ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary/70'
          )}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((c) => (
            <option key={c.code} value={c.code} className="bg-black-main text-white">
              {c.code} · {c.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {loadError && (
        <p data-cy="courses-load-error" className="text-[11px] text-red-400">
          {loadError}{' '}
          <button type="button" onClick={onRetry} className="font-semibold text-primary-light hover:underline">
            Reintentar
          </button>
        </p>
      )}
      {error && (
        <p id={errorId} data-cy={`field-error-${name}`} className="text-[11px] text-red-400">
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
}) {
  const errorId = `${name}-error`;
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={name}
        className="text-[11px] font-medium uppercase tracking-[0.13em] text-muted-foreground"
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
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'w-full bg-black-main px-3 py-[11px] text-[13px] text-white placeholder:text-muted-foreground',
            'border transition-colors duration-150 focus:outline-none',
            trailing && 'pr-10',
            error ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary/70'
          )}
        />
        {trailing && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</span>
        )}
      </div>
      {error && (
        <p id={errorId} data-cy={`field-error-${name}`} className="text-[11px] text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
