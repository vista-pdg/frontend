import type { CourseDto } from './auth';

export type MetricStatus = 'AVAILABLE' | 'SUPPRESSED' | 'UNAVAILABLE';
export type TopicLevel = 'DIFICIL' | 'EN_PROGRESO' | 'DOMINADO' | 'SIN_DATOS';

/** HU-36: curso obligatorio; fechas y quiz opcionales (cadena vacía = sin filtro). */
export interface AnalyticsFilter {
  courseCode: string;
  from: string;
  to: string;
  quizId: string;
}

export interface QuizRef {
  id: number;
  title: string;
}

export interface Overview {
  structureRequests: number;
  algorithmExecutions: number;
  quizAnswers: number;
  quizAccuracy: number | null;
  unansweredRate: number | null;
  quizzesWithAnswers: number;
  finishedAttempts: number;
  studyAnswers: number;
  studyAccuracy: number | null;
  medianSeconds: number | null;
  timedShare: number | null;
}

export interface TopicInsight {
  topicKey: string;
  topicLabel: string;
  level: TopicLevel;
  smallSample: boolean;
  quizAnswers: number;
  quizAccuracy: number | null;
  unansweredRate: number | null;
  medianSeconds: number | null;
  studyAnswers: number;
  studyAccuracy: number | null;
  hintRate: number | null;
  solutionRate: number | null;
  practiceExecutions: number;
  practicedAccuracy: number | null;
  unpracticedAccuracy: number | null;
  commonMistake: string | null;
  commonMistakeShare: number | null;
}

export interface QuestionInsight {
  quizId: number;
  quizTitle: string | null;
  topicKey: string;
  topicLabel: string;
  statement: string;
  answers: number;
  accuracy: number;
  unansweredRate: number;
  medianSeconds: number | null;
  correctOption: string | null;
  commonWrongOption: string | null;
  commonWrongShare: number | null;
}

export interface QuizInsight {
  id: number;
  title: string;
  phase: 'SCHEDULED' | 'OPEN' | 'CLOSED';
  finished: number;
  enrolled: number;
  averageGrade: number | null;
  accuracy: number | null;
  medianSeconds: number | null;
  weakestTopic: string | null;
  strongestTopic: string | null;
}

/**
 * Contrato de PedagogicalReport. HU-36: el umbral es del grupo (`status`); si no se alcanza, las
 * listas llegan vacías y no hay valores ocultos por fila. Las tasas son fracciones de 0 a 1.
 */
export interface PedagogicalReport {
  course: CourseDto;
  from: string | null;
  to: string | null;
  wholeTerm: boolean;
  quiz: QuizRef | null;
  timezone: string;
  minimumParticipants: number;
  status: MetricStatus;
  activeStudents: number | null;
  enrolledStudents: number | null;
  retryThreshold: number;
  retryMinAttempts: number;
  retryWindowSeconds: number;
  totalRequests: number | null;
  overview: Overview | null;
  topics: TopicInsight[];
  hardestQuestions: QuestionInsight[];
  easiestQuestions: QuestionInsight[];
  quizzes: QuizInsight[];
  structures: {
    structure: string;
    status: MetricStatus;
    frequency: number | null;
    percentage: number | null;
  }[];
  algorithms: {
    algorithm: string;
    status: MetricStatus;
    executions: number | null;
    stepsStatus: MetricStatus;
    averageCompletedSteps: number | null;
  }[];
  retries: {
    structure: string;
    status: MetricStatus;
    sessions: number | null;
    sessionsWithRetries: number | null;
    retryRate: number | null;
    highlighted: boolean | null;
  }[];
}
