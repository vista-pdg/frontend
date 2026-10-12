import type { CourseDto } from './auth';

export type MetricStatus = 'AVAILABLE' | 'SUPPRESSED' | 'UNAVAILABLE';

export interface AnalyticsFilter {
  courseCode: string;
  from: string;
  to: string;
}

/** Contrato de PedagogicalReport: los valores ocultos son null, nunca cero. */
export interface PedagogicalReport {
  course: CourseDto;
  from: string;
  to: string;
  timezone: string;
  minimumParticipants: number;
  retryThreshold: number;
  retryMinAttempts: number;
  retryWindowSeconds: number;
  totalRequests: number | null;
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
