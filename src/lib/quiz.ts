import type {
  AnswerOutcome,
  AttemptDto,
  BankQuestionDto,
  CreateQuizRequest,
  MaterialDto,
  QuizPhase,
  QuizTopicDto,
  ResultStatus,
  StudentQuizState,
} from '@/types/quiz';

/** Lógica pura de quizzes (HU-34): formato, validación del formulario y reloj del intento. */

export type QuizTone = 'primary' | 'warning' | 'success' | 'neutral' | 'danger';

const dateTime = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'America/Bogota',
});

/** «17 nov, 08:00» en hora de Bogotá, la zona en la que el docente fija la ventana. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : dateTime.format(date);
}

/** Nota con coma decimal y un decimal fijo: 4.2 → «4,2». */
export function formatGrade(grade: number | null | undefined): string {
  return grade === null || grade === undefined ? '—' : grade.toFixed(1).replace('.', ',');
}

/** Tiempo restante como mm:ss, o h:mm:ss cuando pasa de una hora. Nunca negativo. */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Desfase entre el reloj del servidor y el del navegador. El plazo lo decide el servidor; con este
 * desfase el temporizador no se adelanta ni se atrasa aunque el equipo tenga la hora mal puesta.
 */
export function clockOffset(serverTime: string, localNow: number): number {
  const server = new Date(serverTime).getTime();
  return Number.isNaN(server) ? 0 : server - localNow;
}

export function remainingMs(attempt: Pick<AttemptDto, 'deadline'>, offset: number, localNow: number): number {
  return Math.max(0, new Date(attempt.deadline).getTime() - (localNow + offset));
}

export function answeredCount(attempt: Pick<AttemptDto, 'questions'>): number {
  return attempt.questions.filter(question => question.selectedOption !== null).length;
}

export const studentStateLabel: Record<StudentQuizState, { label: string; tone: QuizTone }> = {
  OPEN: { label: 'Disponible', tone: 'primary' },
  IN_PROGRESS: { label: 'En curso', tone: 'warning' },
  FINISHED: { label: 'Finalizado', tone: 'success' },
  UPCOMING: { label: 'Próximo', tone: 'neutral' },
  MISSED: { label: 'Sin presentar', tone: 'danger' },
};

export const phaseLabel: Record<QuizPhase, { label: string; tone: QuizTone }> = {
  DRAFT: { label: 'Borrador', tone: 'warning' },
  SCHEDULED: { label: 'Programado', tone: 'neutral' },
  OPEN: { label: 'Abierto', tone: 'success' },
  CLOSED: { label: 'Cerrado', tone: 'neutral' },
};

export const resultStatusLabel: Record<ResultStatus, { label: string; tone: QuizTone }> = {
  SUBMITTED: { label: 'Entregado', tone: 'success' },
  EXPIRED: { label: 'Tiempo agotado', tone: 'danger' },
  IN_PROGRESS: { label: 'En curso', tone: 'warning' },
  NOT_STARTED: { label: 'Sin presentar', tone: 'neutral' },
};

export const answerMark: Record<AnswerOutcome, { symbol: string; label: string }> = {
  CORRECT: { symbol: '✓', label: 'Correcta' },
  INCORRECT: { symbol: '✗', label: 'Incorrecta' },
  UNANSWERED: { symbol: '—', label: 'Sin responder' },
};

/** Temas agrupados por familia, en el orden en que llega el catálogo. */
export function groupTopics(topics: QuizTopicDto[]): { family: string; label: string; topics: QuizTopicDto[] }[] {
  const groups: { family: string; label: string; topics: QuizTopicDto[] }[] = [];
  for (const topic of topics) {
    let group = groups.find(candidate => candidate.family === topic.family);
    if (!group) {
      group = { family: topic.family, label: topic.familyLabel, topics: [] };
      groups.push(group);
    }
    group.topics.push(topic);
  }
  return groups;
}

export interface QuizFormValues {
  courseCode: string;
  title: string;
  topics: string[];
  questionsPerStudent: string;
  studentCount: string;
  timeLimitMinutes: string;
  /** Valor de `<input type="datetime-local">`: hora local sin zona. */
  opensAt: string;
  closesAt: string;
  showGrade: boolean;
  /** HU-36: instrucciones opcionales para la IA. */
  instructions: string;
}

export type QuizFormErrors = Partial<Record<keyof QuizFormValues, string>>;

export const MAX_BANK = 600;

function integer(value: string): number | null {
  return /^\d+$/.test(value.trim()) ? Number(value.trim()) : null;
}

/** Preguntas del banco: preguntas por estudiante × estudiantes. Nulo si falta algún dato. */
export function bankSize(values: Pick<QuizFormValues, 'questionsPerStudent' | 'studentCount'>): number | null {
  const perStudent = integer(values.questionsPerStudent);
  const students = integer(values.studentCount);
  return perStudent === null || students === null ? null : perStudent * students;
}

export function validateQuizForm(values: QuizFormValues, now: Date = new Date()): QuizFormErrors {
  const errors: QuizFormErrors = {};
  if (!values.courseCode) errors.courseCode = 'Selecciona un curso.';
  const title = values.title.trim();
  if (!title) errors.title = 'Escribe un título.';
  else if (title.length > 160) errors.title = 'El título admite hasta 160 caracteres.';
  if (values.topics.length === 0) errors.topics = 'Selecciona al menos un tema.';

  const perStudent = integer(values.questionsPerStudent);
  if (perStudent === null || perStudent < 1 || perStudent > 20) {
    errors.questionsPerStudent = 'Indica entre 1 y 20 preguntas por estudiante.';
  }
  const students = integer(values.studentCount);
  if (students === null || students < 1 || students > 300) {
    errors.studentCount = 'Indica entre 1 y 300 estudiantes.';
  } else if (perStudent !== null && perStudent * students > MAX_BANK) {
    errors.studentCount = `El banco no puede superar ${MAX_BANK} preguntas.`;
  }
  const minutes = integer(values.timeLimitMinutes);
  if (minutes === null || minutes < 1 || minutes > 240) {
    errors.timeLimitMinutes = 'Indica entre 1 y 240 minutos.';
  }

  const opens = new Date(values.opensAt);
  const closes = new Date(values.closesAt);
  if (!values.opensAt || Number.isNaN(opens.getTime())) errors.opensAt = 'Indica la fecha y hora de apertura.';
  if (!values.closesAt || Number.isNaN(closes.getTime())) errors.closesAt = 'Indica la fecha y hora de cierre.';
  else if (!errors.opensAt && closes <= opens) errors.closesAt = 'El cierre debe ser posterior a la apertura.';
  else if (closes <= now) errors.closesAt = 'El cierre debe estar en el futuro.';
  if (values.instructions.trim().length > MAX_INSTRUCTIONS) {
    errors.instructions = `Las instrucciones admiten hasta ${MAX_INSTRUCTIONS} caracteres.`;
  }
  return errors;
}

/** Solo se llama con un formulario válido: convierte las horas locales a instantes UTC. */
export function toCreateRequest(values: QuizFormValues): CreateQuizRequest {
  return {
    courseCode: values.courseCode,
    title: values.title.trim(),
    topics: values.topics,
    questionsPerStudent: Number(values.questionsPerStudent),
    studentCount: Number(values.studentCount),
    timeLimitMinutes: Number(values.timeLimitMinutes),
    opensAt: new Date(values.opensAt).toISOString(),
    closesAt: new Date(values.closesAt).toISOString(),
    showGrade: values.showGrade,
    instructions: values.instructions.trim() || null,
  };
}

// ── HU-36: instrucciones, material y edición de preguntas ───────────────

export const MAX_INSTRUCTIONS = 2000;
export const MAX_SOURCES = 5;
export const MAX_MATERIAL_BYTES = 10 * 1024 * 1024;
export const MATERIAL_EXTENSIONS = ['.pdf', '.md', '.markdown', '.txt', '.docx', '.ipynb'] as const;
export const MATERIAL_ACCEPT = MATERIAL_EXTENSIONS.join(',');
export const MAX_AI_INSTRUCTION = 600;

/** Una fuente aún no enviada: el formulario de nuevo quiz las lee al crear el quiz. */
export type PendingSource =
  | { key: string; kind: 'link'; url: string; crawl: boolean }
  | { key: string; kind: 'file'; file: File };

export type SourceStatus = { state: 'pending' } | { state: 'reading' } | { state: 'ready'; material: MaterialDto } | { state: 'error'; message: string };

export function validateMaterialLink(url: string): string | null {
  const value = url.trim();
  if (!value) return 'Escribe un enlace.';
  if (!/^https?:\/\/\S+$/i.test(value)) return 'Usa un enlace que empiece por http:// o https://.';
  try {
    new URL(value);
  } catch {
    return 'El enlace no es válido.';
  }
  return null;
}

export function validateMaterialFile(file: Pick<File, 'name' | 'size'>): string | null {
  const name = file.name.toLowerCase();
  if (!MATERIAL_EXTENSIONS.some(ext => name.endsWith(ext))) {
    return `${file.name}: formato no admitido. Usa PDF, Markdown, TXT, DOCX o .ipynb.`;
  }
  if (file.size === 0) return `${file.name} está vacío.`;
  if (file.size > MAX_MATERIAL_BYTES) return `${file.name} pesa ${formatBytes(file.size)}; el máximo es 10 MB.`;
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString('es-CO', { maximumFractionDigits: 1 })} MB`;
}

/** «Sitio · 24 páginas · 386 mil caracteres (recortado)». */
export function materialDetail(material: MaterialDto): string {
  const parts: string[] = [material.formatLabel];
  if (material.format === 'SITE' || material.format === 'PDF') {
    parts.push(`${material.pages} ${material.pages === 1 ? 'página' : 'páginas'}${material.format === 'SITE' && material.pages >= 30 ? ' (límite)' : ''}`);
  }
  const thousands = Math.round(material.characters / 1000);
  parts.push(`${thousands > 0 ? `${thousands.toLocaleString('es-CO')} mil` : material.characters} caracteres${material.truncated ? ' (recortado)' : ''}`);
  return parts.join(' · ');
}

export function pendingDetail(source: PendingSource): string {
  if (source.kind === 'file') return `${source.file.name.split('.').pop()?.toUpperCase() ?? 'Archivo'} · ${formatBytes(source.file.size)} · se leerá al crear el quiz`;
  return `${source.crawl ? 'Sitio' : 'Enlace'} · se leerá al crear el quiz`;
}

export interface QuestionDraft {
  statement: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hint: string;
}

export type QuestionDraftErrors = Partial<Record<'statement' | 'correctIndex' | 'explanation' | 'hint' | 'options' | `options.${number}`, string>>;

const WILDCARDS = ['todas las anteriores', 'ninguna de las anteriores', 'todas las opciones', 'ninguna de las opciones', 'todas son correctas', 'ninguna es correcta'];

function normalized(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Mismas reglas de forma que el servidor (QuestionRules); el servidor tiene la última palabra. */
export function validateQuestionDraft(draft: QuestionDraft): QuestionDraftErrors {
  const errors: QuestionDraftErrors = {};
  const statement = draft.statement.trim();
  if (statement.length < 20) errors.statement = 'El enunciado necesita al menos 20 caracteres.';
  else if (statement.length > 1200) errors.statement = 'El enunciado admite hasta 1200 caracteres.';
  const seen = new Set<string>();
  draft.options.forEach((option, index) => {
    const text = option.trim();
    const key = `options.${index}` as const;
    if (!text) errors[key] = `Escribe la opción ${index + 1}.`;
    else if (text.length > 320) errors[key] = 'La opción admite hasta 320 caracteres.';
    else if (WILDCARDS.some(w => normalized(text).includes(w))) errors[key] = 'Las opciones se barajan para cada estudiante: evita «todas» o «ninguna de las anteriores».';
    else if (seen.has(normalized(text))) errors[key] = 'Esta opción repite otra; las cuatro deben ser distintas.';
    seen.add(normalized(text));
  });
  if (draft.correctIndex < 0 || draft.correctIndex > 3) errors.correctIndex = 'Marca la opción correcta.';
  if (draft.explanation.trim().length > 2000) errors.explanation = 'La justificación admite hasta 2000 caracteres.';
  if (draft.hint.trim().length > 200) errors.hint = 'La pista admite hasta 200 caracteres.';
  return errors;
}

/**
 * Aviso, no error: una correcta mucho más larga que las demás delata la respuesta. Es la misma
 * heurística con la que el generador descarta preguntas.
 */
export function longCorrectWarning(draft: Pick<QuestionDraft, 'options' | 'correctIndex'>): boolean {
  const lengths = draft.options.map(o => o.trim().length);
  const correct = lengths[draft.correctIndex] ?? 0;
  const others = lengths.filter((_, i) => i !== draft.correctIndex);
  if (others.length === 0 || correct === 0) return false;
  return correct > Math.max(...others) * 2 && correct > Math.max(...others) + 24;
}

export function questionDraft(question: Pick<BankQuestionDto, 'statement' | 'options' | 'correctIndex' | 'explanation' | 'hint'>): QuestionDraft {
  return {
    statement: question.statement,
    options: [...question.options],
    correctIndex: question.correctIndex,
    explanation: question.explanation ?? '',
    hint: question.hint ?? '',
  };
}

export const editKindLabel: Record<'MANUAL' | 'AI', string> = { MANUAL: 'Editada', AI: 'Editada con IA' };

/** Valor para `<input type="datetime-local">` en la hora local del navegador. */
export function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Teclas que el modo de prueba intercepta: copiar, cortar, pegar, imprimir, guardar, ver código y
 * la tecla de captura. No impide una captura del sistema operativo; la deja registrada.
 */
export function blockedShortcut(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}): 'COPY' | 'CUT' | 'PASTE' | 'PRINT' | 'SHORTCUT' | null {
  const key = event.key.toLowerCase();
  if (key === 'printscreen') return 'PRINT';
  if (key === 'f12') return 'SHORTCUT';
  if (!(event.ctrlKey || event.metaKey)) return null;
  if (key === 'c') return event.shiftKey ? 'SHORTCUT' : 'COPY';
  if (key === 'x') return 'CUT';
  if (key === 'v') return 'PASTE';
  if (key === 'p') return 'PRINT';
  if (key === 's' || key === 'u') return 'SHORTCUT';
  if (event.shiftKey && (key === 'i' || key === 'j' || key === 's')) return 'SHORTCUT';
  return null;
}

/** Esperas antes de reintentar un lote tras un fallo transitorio; su número es el de reintentos. */
export const GENERATION_RETRY_DELAYS_MS = [2_000, 5_000, 10_000] as const;

export interface GenerationFailure {
  /** Corte de red, tiempo agotado o 429/502/503/504: vale la pena reintentar el mismo lote. */
  retryable: boolean;
  message: string;
}

/** Qué conserva un fallo: el banco del docente o el quiz de estudio (HU-35). */
export const KEEPS_BANK = 'El banco conserva lo generado.';
export const KEEPS_STUDY = 'Tu quiz conserva lo generado.';

/**
 * Traduce el fallo de un lote a una causa comprensible. Sin `status` la petición nunca obtuvo
 * respuesta: corte de red, cambio de conexión o tiempo agotado. Es la causa más común en un banco
 * largo, que encadena decenas de peticiones. Los lotes de estudio gastan la cuota del asistente:
 * agotarla (HU-35) no se arregla reintentando.
 */
export function generationFailure(status: number | undefined, serverMessage?: string, code?: string, keeps: string = KEEPS_BANK): GenerationFailure {
  if (code === 'DAILY_QUOTA_EXCEEDED') {
    return { retryable: false, message: `Alcanzaste tu límite diario del asistente. ${keeps} Podrás completarlo después de medianoche.` };
  }
  if (status === undefined || status === 0) {
    return { retryable: true, message: `Se perdió la conexión con el servidor. ${keeps} Revisa tu red y reanuda.` };
  }
  if (status === 503) {
    return { retryable: true, message: `${serverMessage || 'El servicio del modelo no está disponible.'} ${keeps}` };
  }
  if (status === 429 || status === 502 || status === 504) {
    return { retryable: true, message: `El servidor no respondió a tiempo (${status}). ${keeps}` };
  }
  if (status === 401) return { retryable: false, message: `Tu sesión expiró. Inicia sesión de nuevo; ${keeps.charAt(0).toLowerCase()}${keeps.slice(1)}` };
  if (status === 403) return { retryable: false, message: keeps === KEEPS_BANK ? 'Ya no tienes acceso a este curso.' : 'No tienes acceso a este quiz.' };
  if (status === 404) return { retryable: false, message: 'Este quiz ya no existe.' };
  if (status === 409 && serverMessage) return { retryable: false, message: serverMessage };
  return { retryable: false, message: `No se pudo generar el lote (error ${status}). ${keeps}` };
}

/** Avance de un quiz de estudio para su fila: lo generado, lo respondido y la ayuda usada. */
export function studyProgressLine(quiz: { questionCount: number; generated: number; answered: number; correct: number; hintsUsed: number; solutionsShown: number }): string {
  if (quiz.generated < quiz.questionCount) return `${quiz.generated} de ${quiz.questionCount} generadas · la generación no ha terminado`;
  const parts = [`${quiz.answered} de ${quiz.questionCount} respondidas`, `${quiz.correct} ${quiz.correct === 1 ? 'acierto' : 'aciertos'}`];
  if (quiz.hintsUsed > 0) parts.push(`${quiz.hintsUsed} ${quiz.hintsUsed === 1 ? 'pista' : 'pistas'}`);
  if (quiz.solutionsShown > 0) parts.push(`${quiz.solutionsShown} ${quiz.solutionsShown === 1 ? 'solución vista' : 'soluciones vistas'}`);
  return parts.join(' · ');
}

export type StudyState = 'INCOMPLETE' | 'IN_PROGRESS' | 'COMPLETE';

export function studyState(quiz: { questionCount: number; generated: number; answered: number; solutionsShown: number }): StudyState {
  if (quiz.generated < quiz.questionCount) return 'INCOMPLETE';
  return quiz.answered + quiz.solutionsShown >= quiz.questionCount ? 'COMPLETE' : 'IN_PROGRESS';
}

export const studyStateLabel: Record<StudyState, { label: string; tone: QuizTone }> = {
  INCOMPLETE: { label: 'Incompleto', tone: 'neutral' },
  IN_PROGRESS: { label: 'En curso', tone: 'warning' },
  COMPLETE: { label: 'Completo', tone: 'success' },
};

export type OptionMark = 'chosen-correct' | 'chosen-wrong' | 'correct' | 'none';

/** Marca de una opción ya resuelta: la elegida, la correcta o ninguna. El texto acompaña al color. */
export function optionMark(index: number, selected: number | null, correct: number | null): OptionMark {
  if (correct === null) return 'none';
  if (index === selected) return index === correct ? 'chosen-correct' : 'chosen-wrong';
  return index === correct ? 'correct' : 'none';
}

/** `aria-describedby` de un campo: su error o, si no hay, su ayuda. */
export function fieldDescribedBy(id: string, error?: string, hint?: string): string | undefined {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

/**
 * Lotes que costará un quiz de estudio, con el mismo reparto que el servidor: cada lote es del tema
 * menos cubierto, de hasta `batchSize` preguntas y sin pasar la parte de ese tema. Supone que el
 * modelo no descarta preguntas; es la cuenta que se muestra antes de generar.
 */
export function estimatedBatches(target: number, topicCount: number, batchSize = 4): number {
  if (target < 1 || topicCount < 1) return 0;
  const share = Math.ceil(target / topicCount);
  const covered = new Array<number>(topicCount).fill(0);
  let generated = 0;
  let batches = 0;
  while (generated < target) {
    const topic = covered.indexOf(Math.min(...covered));
    const count = Math.min(Math.max(1, batchSize), target - generated, Math.max(1, share - covered[topic]));
    covered[topic] += count;
    generated += count;
    batches += 1;
  }
  return batches;
}

export interface StudyFormErrors {
  topics?: string;
  questionCount?: string;
  title?: string;
}

/** Validación del formulario de estudio; las mismas reglas que el servidor. */
export function validateStudyForm(values: { title: string; topics: string[]; questionCount: string }): StudyFormErrors {
  const errors: StudyFormErrors = {};
  if (values.topics.length === 0) errors.topics = 'Selecciona al menos un tema.';
  const count = Number(values.questionCount);
  if (!Number.isInteger(count) || count < 1 || count > 10) errors.questionCount = 'Elige de 1 a 10 preguntas.';
  if (values.title.trim().length > 160) errors.title = 'El título admite hasta 160 caracteres.';
  return errors;
}

/** Resumen de un quiz de estudio a partir de sus preguntas: lo que se pinta tras cada acción. */
export function studySummary(questions: { selectedOption: number | null; correctOption: number | null; hintShown: boolean; solutionShown: boolean }[]) {
  const answered = questions.filter(q => q.selectedOption !== null);
  return {
    answered: answered.length,
    correct: answered.filter(q => q.selectedOption === q.correctOption).length,
    hints: questions.filter(q => q.hintShown).length,
    solutions: questions.filter(q => q.solutionShown).length,
    resolved: questions.filter(q => q.selectedOption !== null || q.solutionShown).length,
  };
}
