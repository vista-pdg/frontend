import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Database, Plus, Sparkles } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { BankProgress } from '@/components/quiz/BankProgress';
import { QuizBadge } from '@/components/quiz/QuizBadge';
import { MicroLabel, QuizPageShell, quizControlClass } from '@/components/quiz/QuizPageShell';
import { useAuth } from '@/contexts/useAuth';
import { useBankGeneration } from '@/hooks/useBankGeneration';
import { ApiError } from '@/lib/http';
import { MAX_INSTRUCTIONS, bankSize, fieldDescribedBy, formatDateTime, materialDetail, pendingDetail, phaseLabel, toCreateRequest, toLocalInput, validateQuizForm, type PendingSource, type QuizFormErrors, type QuizFormValues, type SourceStatus } from '@/lib/quiz';
import { TopicPicker } from '@/components/quiz/TopicPicker';
import { QuizField } from '@/components/quiz/QuizField';
import { MaterialSources, type SourceRow } from '@/components/quiz/MaterialSources';
import { addMaterialFile, addMaterialLink, createQuiz, fetchManagedCourses, fetchManagedQuizzes, fetchQuizTopics } from '@/services/quizService';
import type { ManagedCourseDto, QuizSummaryDto, QuizTopicDto } from '@/types/quiz';

type LoadState<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T };
const FIELD_ORDER: (keyof QuizFormValues)[] = ['courseCode', 'title', 'topics', 'questionsPerStudent', 'studentCount', 'timeLimitMinutes', 'opensAt', 'closesAt', 'instructions'];

type NewSource = { kind: 'link'; url: string; crawl: boolean } | { kind: 'file'; file: File };

/** Fila visible de una fuente: pendiente antes de crear el quiz y luego leída o con su error. */
function sourceRow(source: PendingSource, status: SourceStatus | undefined): SourceRow {
  const title = source.kind === 'link' ? source.url : source.file.name;
  const state = status?.state ?? 'pending';
  const detail = status?.state === 'ready' ? materialDetail(status.material)
    : status?.state === 'error' ? status.message
      : status?.state === 'reading' ? (source.kind === 'link' && source.crawl ? 'Recorriendo el sitio…' : 'Leyendo…')
        : pendingDetail(source);
  return { key: source.key, kind: source.kind, title: status?.state === 'ready' ? status.material.name : title, detail, state, format: status?.state === 'ready' ? status.material.format : undefined };
}

function emptyForm(course: ManagedCourseDto | undefined): QuizFormValues {
  const opens = new Date();
  opens.setMinutes(0, 0, 0);
  opens.setHours(opens.getHours() + 1);
  const closes = new Date(opens.getTime() + 2 * 24 * 60 * 60 * 1000);
  return {
    courseCode: course?.code ?? '',
    title: '',
    topics: [],
    questionsPerStudent: '3',
    studentCount: course && course.enrolledStudents > 0 ? String(course.enrolledStudents) : '',
    timeLimitMinutes: '30',
    opensAt: toLocalInput(opens),
    closesAt: toLocalInput(closes),
    showGrade: true,
    instructions: '',
  };
}

function sourceFailure(error: unknown, field: 'url' | 'file'): string {
  if (error instanceof ApiError) return error.fieldErrors[field] ?? error.message;
  return 'No se pudo leer la fuente. Revisa tu conexión.';
}

function NewQuizForm({ courses, topics, initialCourse, onCancel }: {
  courses: ManagedCourseDto[];
  topics: QuizTopicDto[];
  initialCourse: string;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<QuizFormValues>(() => emptyForm(courses.find(c => c.code === initialCourse) ?? courses[0]));
  const [errors, setErrors] = useState<QuizFormErrors>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<QuizSummaryDto | null>(null);
  const [progress, setProgress] = useState({ bankSize: 0, bankTarget: 0 });
  const [sources, setSources] = useState<PendingSource[]>([]);
  const [statuses, setStatuses] = useState<Record<string, SourceStatus>>({});
  const [phase, setPhase] = useState<'form' | 'reading' | 'problem' | 'generating'>('form');
  const sourceSeq = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);
  const generation = useBankGeneration(created?.id ?? null, setProgress);

  const course = courses.find(c => c.code === values.courseCode);
  const bank = bankSize(values);
  const locked = saving || created !== null;
  const settled = sources.filter(s => statuses[s.key]?.state === 'ready' || statuses[s.key]?.state === 'error').length;
  const failedSources = sources.flatMap(s => { const st = statuses[s.key]; return st?.state === 'error' ? [{ key: s.key, message: st.message }] : []; });

  function set<K extends keyof QuizFormValues>(field: K, value: QuizFormValues[K]) {
    setValues(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
    setServerError('');
  }
  function changeCourse(code: string) {
    const next = courses.find(c => c.code === code);
    setValues(current => ({ ...current, courseCode: code, studentCount: next && next.enrolledStudents > 0 ? String(next.enrolledStudents) : '' }));
    setErrors(current => ({ ...current, courseCode: undefined, studentCount: undefined }));
  }
  function toggleTopic(key: string) {
    set('topics', values.topics.includes(key) ? values.topics.filter(k => k !== key) : [...values.topics, key]);
  }
  function focusFirst(found: QuizFormErrors) {
    const first = FIELD_ORDER.find(field => found[field]);
    if (!first) return;
    const target = first === 'topics'
      ? formRef.current?.querySelector<HTMLElement>('[data-cy^="quiz-topic-"]')
      : formRef.current?.elements.namedItem(first) as HTMLElement | null;
    target?.focus();
  }

  function addSource(source: NewSource) {
    sourceSeq.current += 1;
    const key = `s${sourceSeq.current}`;
    setSources(current => [...current, { ...source, key }]);
    return null;
  }
  /** HU-36 · CA-2: el material se lee al crear el quiz, una fuente tras otra, antes de generar. */
  async function readSources(quizId: number): Promise<number> {
    let failed = 0;
    for (const source of sources) {
      setStatuses(current => ({ ...current, [source.key]: { state: 'reading' } }));
      try {
        const material = source.kind === 'link'
          ? await addMaterialLink(quizId, source.url, source.crawl)
          : await addMaterialFile(quizId, source.file);
        setStatuses(current => ({ ...current, [source.key]: { state: 'ready', material } }));
      } catch (error) {
        failed += 1;
        setStatuses(current => ({ ...current, [source.key]: { state: 'error', message: sourceFailure(error, source.kind === 'link' ? 'url' : 'file') } }));
      }
    }
    return failed;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (locked) return;
    const found = validateQuizForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return focusFirst(found);
    setSaving(true);
    setServerError('');
    try {
      const quiz = await createQuiz(toCreateRequest(values));
      setCreated(quiz);
      setProgress({ bankSize: quiz.bankSize, bankTarget: quiz.bankTarget });
      setSaving(false);
      if (sources.length > 0) {
        setPhase('reading');
        if (await readSources(quiz.id) > 0) return setPhase('problem');
      }
      setPhase('generating');
      void generation.start(quiz.id);
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        const fromServer = error.fieldErrors as QuizFormErrors;
        setErrors(fromServer);
        focusFirst(fromServer);
      } else {
        setServerError(error instanceof ApiError && error.status === 403
          ? 'No tienes acceso a este curso.' : 'No se pudo crear el quiz. Intenta de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  }

  const input = (field: 'questionsPerStudent' | 'studentCount' | 'timeLimitMinutes', label: string, hint?: string) => (
    <QuizField id={`quiz-${field}`} label={label} error={errors[field]} hint={hint}>
      <input id={`quiz-${field}`} name={field} data-cy={`quiz-${field}`} type="text" inputMode="numeric" autoComplete="off" className={quizControlClass}
        value={values[field]} onChange={e => set(field, e.target.value)} disabled={locked}
        aria-invalid={!!errors[field]} aria-describedby={fieldDescribedBy(`quiz-${field}`, errors[field], hint)} />
    </QuizField>
  );
  const dateInput = (field: 'opensAt' | 'closesAt', label: string) => (
    <QuizField id={`quiz-${field}`} label={label} error={errors[field]}>
      <input id={`quiz-${field}`} name={field} data-cy={`quiz-${field}`} type="datetime-local" className={quizControlClass}
        value={values[field]} onChange={e => set(field, e.target.value)} disabled={locked}
        aria-invalid={!!errors[field]} aria-describedby={fieldDescribedBy(`quiz-${field}`, errors[field])} />
    </QuizField>
  );

  return (
    <div className="mt-2 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <form ref={formRef} onSubmit={submit} noValidate data-cy="quiz-form" aria-label="Nuevo quiz" className="min-w-0 space-y-5">
        <h1 className="text-[20px] font-bold tracking-tight">Nuevo quiz</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          <QuizField id="quiz-courseCode" label="Curso" error={errors.courseCode}>
            <select id="quiz-courseCode" name="courseCode" data-cy="quiz-courseCode" className={quizControlClass} value={values.courseCode}
              onChange={e => changeCourse(e.target.value)} disabled={locked} aria-invalid={!!errors.courseCode} aria-describedby={fieldDescribedBy('quiz-courseCode', errors.courseCode)}>
              {courses.map(c => <option key={c.code} value={c.code}>{c.code} · {c.termCode}</option>)}
            </select>
          </QuizField>
          <QuizField id="quiz-title" label="Título" error={errors.title}>
            <input id="quiz-title" name="title" data-cy="quiz-title" type="text" autoComplete="off" maxLength={160} className={quizControlClass}
              value={values.title} onChange={e => set('title', e.target.value)} disabled={locked}
              aria-invalid={!!errors.title} aria-describedby={fieldDescribedBy('quiz-title', errors.title)} />
          </QuizField>
        </div>

        <TopicPicker topics={topics} selected={values.topics} onToggle={toggleTopic} disabled={locked} error={errors.topics}
          legend="Temas del quiz" hint="Elige las estructuras y algoritmos de VISTA sobre los que se generarán las preguntas." />

        <div className="grid gap-4 sm:grid-cols-3">
          {input('questionsPerStudent', 'Preguntas por estudiante')}
          {input('studentCount', 'Estudiantes', course
            ? `${course.enrolledStudents} ${course.enrolledStudents === 1 ? 'matriculado' : 'matriculados'} en ${course.code}. Puedes ajustarlo si faltan registros.`
            : undefined)}
          {input('timeLimitMinutes', 'Tiempo límite (minutos)')}
        </div>
        <p className="flex items-center gap-2 bg-card p-3 text-[13px] font-semibold" data-cy="quiz-bank-size" role="status">
          <Database className="size-4 shrink-0 text-primary-light" aria-hidden="true" />
          {bank === null ? 'Banco a generar: indica preguntas y estudiantes' : `Banco a generar: ${bank} preguntas (${values.questionsPerStudent.trim()} × ${values.studentCount.trim()})`}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {dateInput('opensAt', 'Apertura')}
          {dateInput('closesAt', 'Cierre')}
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[13px]">
          <input type="checkbox" role="switch" className="size-4 accent-primary" data-cy="quiz-showGrade" checked={values.showGrade} disabled={locked}
            onChange={e => set('showGrade', e.target.checked)} />
          Mostrar la nota al estudiante al finalizar
        </label>
        <section className="space-y-4 border border-border p-4" aria-labelledby="quiz-ai-title" data-cy="quiz-ai-section">
          <div className="space-y-1">
            <h2 id="quiz-ai-title" className="flex items-center gap-2"><Sparkles className="size-3.5 text-primary-light" aria-hidden="true" /><MicroLabel>Para la IA · opcional</MicroLabel></h2>
            <p className="text-[11px] leading-relaxed text-muted-foreground">Se suman a las reglas de VISTA. El escenario validado y sus hechos siguen siendo la fuente de verdad de cada pregunta.</p>
          </div>
          <QuizField id="quiz-instructions" label="Instrucciones para la IA" error={errors.instructions}
            hint={`${values.instructions.trim().length} / ${MAX_INSTRUCTIONS} · Texto plano. Se aplican a cada lote y a la edición con IA.`}>
            <textarea id="quiz-instructions" name="instructions" data-cy="quiz-instructions" rows={4} className={`${quizControlClass} py-2.5 leading-relaxed`}
              placeholder="Ejemplo: usa la notación del libro del curso y pregunta por el costo de cada operación."
              value={values.instructions} onChange={e => set('instructions', e.target.value)} disabled={locked}
              aria-invalid={!!errors.instructions} aria-describedby={fieldDescribedBy('quiz-instructions', errors.instructions, 'x')} />
          </QuizField>
          <MaterialSources idPrefix="quiz" disabled={locked}
            rows={sources.map(source => sourceRow(source, statuses[source.key]))}
            onAddLink={(url, crawl) => addSource({ kind: 'link', url, crawl })}
            onAddFile={file => addSource({ kind: 'file', file })}
            onRemove={key => setSources(current => current.filter(s => s.key !== key))} />
        </section>
        {serverError && <Alert><span data-cy="quiz-form-error">{serverError}</span></Alert>}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" className="min-h-11 px-4" data-cy="quiz-create" disabled={locked}>
            <Sparkles aria-hidden="true" />{saving ? 'Creando…' : 'Crear y generar banco'}
          </Button>
          <Button type="button" variant="outline" className="min-h-11 px-4" data-cy="quiz-form-cancel" onClick={onCancel}>
            {created ? 'Volver a la lista' : 'Cancelar'}
          </Button>
        </div>
      </form>

      <aside className="space-y-4" aria-label="Estado del banco">
        {created && phase === 'reading' && (
          <section className="space-y-3 border border-border bg-card p-5" data-cy="material-reading" aria-live="polite">
            <MicroLabel>Leyendo material</MicroLabel>
            <p className="font-mono text-[20px] font-semibold">{settled} de {sources.length} fuentes</p>
            <div className="h-1.5 w-full bg-muted" aria-hidden="true"><div className="h-full bg-primary transition-[width]" style={{ width: `${(settled / sources.length) * 100}%` }} /></div>
            <p className="text-[11px] text-muted-foreground">La generación empieza cuando termina la lectura. Un sitio completo puede tardar hasta un minuto.</p>
          </section>
        )}
        {created && phase === 'problem' && (
          <section className="space-y-3 border border-border bg-card p-5" data-cy="material-problem">
            <MicroLabel>{failedSources.length === 1 ? 'Una fuente no se pudo leer' : `${failedSources.length} fuentes no se pudieron leer`}</MicroLabel>
            <Alert><ul className="space-y-1" data-cy="material-problem-list">{failedSources.map(s => <li key={s.key}>{s.message}</li>)}</ul></Alert>
            <p className="text-[11px] leading-relaxed text-muted-foreground">El quiz ya quedó como borrador. Puedes generar sin esas fuentes o corregir el material en su banco.</p>
            <div className="flex flex-wrap gap-3">
              <Button className="min-h-11 px-4" data-cy="material-generate-anyway" onClick={() => { setPhase('generating'); void generation.start(created.id); }}>
                <Sparkles aria-hidden="true" />{failedSources.length === 1 ? 'Generar sin esa fuente' : 'Generar sin esas fuentes'}
              </Button>
              <Link to={`/docencia/quizzes/${created.id}`} data-cy="material-go-bank"
                className="inline-flex min-h-11 items-center border border-border px-4 text-[13px] font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Ir al banco</Link>
            </div>
          </section>
        )}
        {created ? (
          phase === 'generating' && <BankProgress state={generation.state} bankSize={progress.bankSize} bankTarget={progress.bankTarget}
            onStart={() => void generation.start()} onPause={generation.pause} reviewTo={`/docencia/quizzes/${created.id}`} />
        ) : (
          <section className="space-y-3 border border-border p-5">
            <MicroLabel>Cómo se genera el banco</MicroLabel>
            <p className="text-xs leading-relaxed text-muted-foreground">
              VISTA sortea un escenario por pregunta, ejecuta el algoritmo real y pide al modelo una pregunta
              de análisis sobre ese rastro. Las opciones que delatan la respuesta se descartan. Antes de publicar
              podrás revisar cada pregunta y eliminar las que no te convenzan.
            </p>
          </section>
        )}
      </aside>
    </div>
  );
}

/** HU-34 · Gestión docente: lista de quizzes por curso y creación con generación del banco. */
export function QuizManagementPage() {
  const { isAdmin } = useAuth();
  const [setup, setSetup] = useState<LoadState<{ courses: ManagedCourseDto[]; topics: QuizTopicDto[] }>>({ status: 'loading' });
  const [setupAttempt, setSetupAttempt] = useState(0);
  const [courseCode, setCourseCode] = useState('');
  const [quizzes, setQuizzes] = useState<LoadState<QuizSummaryDto[]>>({ status: 'loading' });
  const [listAttempt, setListAttempt] = useState(0);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([fetchManagedCourses(controller.signal), fetchQuizTopics(controller.signal)]).then(([courses, topics]) => {
      if (controller.signal.aborted) return;
      setSetup({ status: 'ready', data: { courses, topics } });
      setCourseCode(current => current || courses[0]?.code || '');
    }).catch(() => { if (!controller.signal.aborted) setSetup({ status: 'error' }); });
    return () => controller.abort();
  }, [setupAttempt]);

  useEffect(() => {
    if (!courseCode || creating) return;
    const controller = new AbortController();
    fetchManagedQuizzes(courseCode, controller.signal)
      .then(data => { if (!controller.signal.aborted) setQuizzes({ status: 'ready', data }); })
      .catch(() => { if (!controller.signal.aborted) setQuizzes({ status: 'error' }); });
    return () => controller.abort();
  }, [courseCode, listAttempt, creating]);

  const courses = setup.status === 'ready' ? setup.data.courses : [];
  const hasCourses = courses.length > 0;

  return (
    <QuizPageShell section="Quizzes del curso" data-cy="quiz-management-page">
      {creating && setup.status === 'ready' ? (
        <NewQuizForm courses={courses} topics={setup.data.topics} initialCourse={courseCode}
          onCancel={() => { setQuizzes({ status: 'loading' }); setCreating(false); }} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-[20px] font-bold tracking-tight">Quizzes</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">Genera bancos de preguntas con IA, asígnalos a tu curso y revisa los resultados.</p>
            </div>
            <Button className="min-h-11 px-4" data-cy="quiz-new" disabled={!hasCourses} onClick={() => setCreating(true)}><Plus aria-hidden="true" />Nuevo quiz</Button>
          </div>

          {setup.status === 'loading' && <p role="status" className="mt-6 text-sm" data-cy="quiz-manage-loading">Cargando cursos…</p>}
          {setup.status === 'error' && (
            <div className="mt-6">
              <Alert><span data-cy="quiz-manage-error">No se pudieron cargar los cursos. Intenta de nuevo.</span></Alert>
              <Button variant="outline" className="mt-3 min-h-11 px-4" data-cy="quiz-manage-retry" onClick={() => { setSetup({ status: 'loading' }); setSetupAttempt(n => n + 1); }}>Reintentar</Button>
            </div>
          )}
          {setup.status === 'ready' && !hasCourses && (
            <p className="mt-6 border border-border p-6 text-sm" data-cy="quiz-manage-no-courses">
              No tienes cursos disponibles. {isAdmin ? 'Crea un curso en Administración.' : 'Solicita la asignación de tu curso al administrador.'}
            </p>
          )}
          {hasCourses && (
            <>
              <div className="mt-7 max-w-md">
                <label htmlFor="quiz-course-filter" className="mb-2 block text-xs font-medium">Curso</label>
                <select id="quiz-course-filter" data-cy="quiz-course-filter" className={quizControlClass} value={courseCode}
                  onChange={e => { setQuizzes({ status: 'loading' }); setCourseCode(e.target.value); }}>
                  {courses.map(c => <option key={c.code} value={c.code}>{c.code} · {c.name} · {c.termCode}</option>)}
                </select>
              </div>
              {quizzes.status === 'loading' && <p role="status" className="mt-6 text-sm" data-cy="quiz-table-loading">Cargando quizzes…</p>}
              {quizzes.status === 'error' && (
                <div className="mt-6">
                  <Alert><span data-cy="quiz-table-error">No se pudieron cargar los quizzes. Intenta de nuevo.</span></Alert>
                  <Button variant="outline" className="mt-3 min-h-11 px-4" data-cy="quiz-table-retry" onClick={() => { setQuizzes({ status: 'loading' }); setListAttempt(n => n + 1); }}>Reintentar</Button>
                </div>
              )}
              {quizzes.status === 'ready' && quizzes.data.length === 0 && (
                <p className="mt-6 border border-border p-6 text-sm" data-cy="quiz-table-empty">Este curso aún no tiene quizzes. Crea el primero con «Nuevo quiz».</p>
              )}
              {quizzes.status === 'ready' && quizzes.data.length > 0 && (
                <div role="region" aria-label="Tabla de quizzes, desplazable" tabIndex={0} className="relative mt-6 overflow-x-auto border border-border scrollbar-custom focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  <table className="w-full min-w-[760px] text-left text-[13px]" data-cy="quiz-table">
                    <caption className="sr-only">Quizzes del curso {courseCode}</caption>
                    <thead>
                      <tr className="border-b border-border">
                        {['Quiz', 'Estado', 'Banco', 'Ventana', 'Entregas', 'Acción'].map(heading => (
                          <th key={heading} scope="col" className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {quizzes.data.map(quiz => {
                        const phase = phaseLabel[quiz.phase];
                        return (
                          <tr key={quiz.id} data-cy={`quiz-manage-row-${quiz.id}`} className="border-b border-border last:border-b-0">
                            <th scope="row" className="px-4 py-3 font-normal">
                              <span className="block text-sm font-semibold break-words">{quiz.title}</span>
                              <span className="text-[11px] text-muted-foreground">{quiz.questionsPerStudent} por estudiante · {quiz.timeLimitMinutes} min</span>
                            </th>
                            <td className="px-4 py-3"><QuizBadge label={phase.label} tone={phase.tone} /></td>
                            <td className="px-4 py-3 font-mono">{quiz.bankSize} / {quiz.bankTarget}</td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{formatDateTime(quiz.opensAt)} → {formatDateTime(quiz.closesAt)}</td>
                            <td className="px-4 py-3 font-mono">{quiz.status === 'DRAFT' ? '—' : `${quiz.attemptsFinished} / ${quiz.enrolledStudents}`}</td>
                            <td className="px-4 py-3">
                              <Link to={`/docencia/quizzes/${quiz.id}`} data-cy={`quiz-manage-open-${quiz.id}`}
                                className="inline-flex min-h-11 items-center border border-border px-3 text-[13px] font-semibold whitespace-nowrap hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                                {quiz.status === 'DRAFT' ? 'Continuar banco' : 'Ver resultados'}
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </QuizPageShell>
  );
}
