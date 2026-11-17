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
  timesAssigned: number;
}

export interface QuizDetailDto {
  quiz: QuizSummaryDto;
  questions: BankQuestionDto[];
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
