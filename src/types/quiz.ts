/** Contratos de quizzes (HU-34), derivados de los records de `com.vista.pdg.quiz.dto.QuizDtos`. */

export interface ManagedCourseDto {
  code: string;
  name: string;
  termCode: string;
  enrolledStudents: number;
}

export interface QuizTopicDto {
  key: string;
  label: string;
  family: string;
  familyLabel: string;
  description: string;
}

export interface CreateQuizRequest {
  courseCode: string;
  title: string;
  topics: string[];
  questionsPerStudent: number;
  /** Nulo = los matriculados del curso. */
  studentCount: number | null;
  timeLimitMinutes: number;
  /** ISO-8601 en UTC. */
  opensAt: string;
  closesAt: string;
  showGrade: boolean;
  /** HU-36: directivas del docente para la IA; nulo si no hay. */
  instructions: string | null;
}

export type QuizPhase = 'DRAFT' | 'SCHEDULED' | 'OPEN' | 'CLOSED';

export interface QuizSummaryDto {
  id: number;
  courseCode: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED';
  phase: QuizPhase;
  topics: QuizTopicDto[];
  questionsPerStudent: number;
  expectedStudents: number;
  bankSize: number;
  bankTarget: number;
  timeLimitMinutes: number;
  opensAt: string;
  closesAt: string;
  showGrade: boolean;
  enrolledStudents: number;
  attemptsStarted: number;
  attemptsFinished: number;
}

export interface BankQuestionDto {
  id: number;
  topicKey: string;
  topicLabel: string;
  scenario: string;
  statement: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  hint: string | null;
  timesAssigned: number;
  /** HU-36: borrador, o publicada sin asignar a ningún intento. */
  editable: boolean;
  editKind: 'MANUAL' | 'AI' | null;
  editedAt: string | null;
}

export type MaterialFormat = 'SITE' | 'HTML' | 'PDF' | 'DOCX' | 'MARKDOWN' | 'TEXT' | 'NOTEBOOK';

/** HU-36: una fuente de material ya leída; el texto no sale del servidor. */
export interface MaterialDto {
  id: number;
  kind: 'LINK' | 'FILE';
  name: string;
  source: string | null;
  format: MaterialFormat;
  formatLabel: string;
  pages: number;
  characters: number;
  truncated: boolean;
  createdAt: string;
}

export interface QuizDetailDto {
  quiz: QuizSummaryDto;
  questions: BankQuestionDto[];
  instructions: string | null;
  materials: MaterialDto[];
}

export interface GuidanceDto {
  instructions: string | null;
  materials: MaterialDto[];
}

export interface QuestionEditRequest {
  statement: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hint: string;
  source: 'MANUAL' | 'AI';
}

export interface AiProposalDto {
  statement: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  hint: string | null;
}

export interface GenerateBatchResponse {
  generated: number;
  discarded: number;
  bankSize: number;
  bankTarget: number;
  complete: boolean;
}

export interface ResultStats {
  average: number | null;
  highest: number | null;
  lowest: number | null;
  finished: number;
  inProgress: number;
  notStarted: number;
  enrolled: number;
}

export type ResultStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
export type AnswerOutcome = 'CORRECT' | 'INCORRECT' | 'UNANSWERED';

export interface StudentResultRow {
  studentId: number;
  displayName: string;
  email: string;
  status: ResultStatus;
  score: number | null;
  total: number | null;
  grade: number | null;
  integrityEvents: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  answers: AnswerOutcome[];
}

export interface QuizResultsDto {
  quiz: QuizSummaryDto;
  stats: ResultStats;
  rows: StudentResultRow[];
}

/** Los campos de nota son nulos mientras el docente no active su visualización. */
export interface AttemptResultDto {
  status: 'SUBMITTED' | 'EXPIRED';
  finishedAt: string;
  gradeVisible: boolean;
  score: number | null;
  total: number | null;
  grade: number | null;
}

export type StudentQuizState = 'UPCOMING' | 'OPEN' | 'IN_PROGRESS' | 'FINISHED' | 'MISSED';

/**
 * Cómo reproducir el escenario en VISTA (HU-35). `chatPrompt` nulo: el chat no construye la misma
 * estructura (ordenamiento, heapify); `values` nulo: el tema se ejecuta sobre el lienzo.
 */
export interface VistaSetup {
  chatPrompt: string | null;
  structureType: string | null;
  structureSubtype: string | null;
  /** Clave del catálogo `type/subtype/operation`. */
  algorithm: string;
  values: number[] | null;
  argument: number | null;
  /** Etiqueta del nodo inicial de los recorridos de grafos. */
  start: string | null;
}

export interface StudentQuizDto {
  id: number;
  title: string;
  topics: string[];
  questionCount: number;
  timeLimitMinutes: number;
  opensAt: string;
  closesAt: string;
  state: StudentQuizState;
  deadline: string | null;
  result: AttemptResultDto | null;
  /** HU-35: finalizado, con nota visible y con el quiz ya cerrado. */
  reviewAvailable: boolean;
}

/** `courseCode` nulo: la cuenta no está matriculada y no puede presentar quizzes. */
export interface StudentQuizListDto {
  courseCode: string | null;
  courseName: string | null;
  quizzes: StudentQuizDto[];
}

/** Nunca trae la opción correcta. `selectedOption` va en el orden barajado del estudiante. */
export interface AttemptQuestionDto {
  position: number;
  topicLabel: string;
  scenario: string;
  statement: string;
  options: string[];
  selectedOption: number | null;
  /** Nula en preguntas creadas antes de HU-35. */
  setup: VistaSetup | null;
}

export interface AttemptDto {
  quizId: number;
  title: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
  startedAt: string;
  deadline: string;
  /** Reloj del servidor al responder: corrige el desfase del reloj del navegador. */
  serverTime: string;
  integrityEvents: number;
  questions: AttemptQuestionDto[];
  result: AttemptResultDto | null;
}

export type IntegrityEventType =
  | 'FOCUS_LOST'
  | 'TAB_HIDDEN'
  | 'FULLSCREEN_EXIT'
  | 'COPY'
  | 'CUT'
  | 'PASTE'
  | 'CONTEXT_MENU'
  | 'PRINT'
  | 'SHORTCUT';

/** Revisión de solo lectura (HU-35). Opciones en el orden en que el estudiante las vio. */
export interface ReviewQuestionDto {
  position: number;
  topicLabel: string;
  scenario: string;
  statement: string;
  options: string[];
  selectedOption: number | null;
  correctOption: number;
  outcome: AnswerOutcome;
  explanation: string | null;
}

export interface AttemptReviewDto {
  quizId: number;
  title: string;
  status: 'SUBMITTED' | 'EXPIRED';
  finishedAt: string;
  score: number | null;
  total: number;
  grade: number | null;
  questions: ReviewQuestionDto[];
}

// ── Quizzes de estudio (HU-35), de `com.vista.pdg.quiz.dto.StudyQuizDtos` ──

export interface CreateStudyQuizRequest {
  title: string;
  topics: string[];
  questionCount: number;
}

export interface StudyQuizSummaryDto {
  id: number;
  title: string;
  topics: string[];
  questionCount: number;
  generated: number;
  answered: number;
  correct: number;
  hintsUsed: number;
  solutionsShown: number;
  createdAt: string;
}

/** La pista llega solo si se pidió; la correcta y la justificación, solo con la pregunta resuelta. */
export interface StudyQuestionDto {
  position: number;
  topicLabel: string;
  scenario: string;
  statement: string;
  options: string[];
  setup: VistaSetup | null;
  selectedOption: number | null;
  hintShown: boolean;
  hint: string | null;
  solutionShown: boolean;
  correctOption: number | null;
  explanation: string | null;
}

export interface StudyQuizDto {
  quiz: StudyQuizSummaryDto;
  questions: StudyQuestionDto[];
}

export interface TutorTurn {
  role: 'student' | 'tutor';
  text: string;
}

export interface TutorReplyDto {
  reply: string;
  remaining: number;
}
