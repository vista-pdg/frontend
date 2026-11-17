import type {
  AnswerOutcome,
  AttemptDto,
  CreateQuizRequest,
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
  };
}

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
