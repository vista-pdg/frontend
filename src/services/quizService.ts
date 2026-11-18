import http from '@/lib/http';
import type {
  AiProposalDto,
  AttemptDto,
  BankQuestionDto,
  GuidanceDto,
  MaterialDto,
  QuestionEditRequest,
  AttemptReviewDto,
  CreateQuizRequest,
  GenerateBatchResponse,
  IntegrityEventType,
  ManagedCourseDto,
  QuizDetailDto,
  QuizResultsDto,
  QuizSummaryDto,
  QuizTopicDto,
  StudentQuizListDto,
} from '@/types/quiz';

// ── Estudiante ──────────────────────────────────────────────────────────

export async function fetchMyQuizzes(signal?: AbortSignal): Promise<StudentQuizListDto> {
  const { data } = await http.get<StudentQuizListDto>('/quizzes', { signal });
  return data;
}

/** Idempotente: si el intento ya existe, lo devuelve tal como está. */
export async function startAttempt(quizId: number): Promise<AttemptDto> {
  const { data } = await http.post<AttemptDto>(`/quizzes/${quizId}/attempt`);
  return data;
}

export async function fetchAttempt(quizId: number, signal?: AbortSignal): Promise<AttemptDto> {
  const { data } = await http.get<AttemptDto>(`/quizzes/${quizId}/attempt`, { signal });
  return data;
}

/** HU-36: `elapsedMs` es el tiempo que la pregunta estuvo visible; el servidor lo acota. */
export async function answerQuestion(
  quizId: number,
  position: number,
  selectedOption: number | null,
  elapsedMs?: number,
): Promise<AttemptDto> {
  const { data } = await http.put<AttemptDto>(`/quizzes/${quizId}/attempt/answers/${position}`, {
    selectedOption,
    ...(elapsedMs === undefined ? {} : { elapsedMs: Math.max(0, Math.round(elapsedMs)) }),
  });
  return data;
}

/** HU-35: revisión de solo lectura; el servidor responde 409 mientras no se habilite. */
export async function fetchAttemptReview(quizId: number, signal?: AbortSignal): Promise<AttemptReviewDto> {
  const { data } = await http.get<AttemptReviewDto>(`/quizzes/${quizId}/attempt/review`, { signal });
  return data;
}

export async function submitAttempt(quizId: number): Promise<AttemptDto> {
  const { data } = await http.post<AttemptDto>(`/quizzes/${quizId}/attempt/submit`);
  return data;
}

export async function reportIntegrityEvent(quizId: number, type: IntegrityEventType): Promise<number> {
  const { data } = await http.post<{ integrityEvents: number }>(`/quizzes/${quizId}/attempt/integrity`, {
    type,
  });
  return data.integrityEvents;
}

// ── Gestión (docente / administrador) ───────────────────────────────────

export async function fetchManagedCourses(signal?: AbortSignal): Promise<ManagedCourseDto[]> {
  const { data } = await http.get<ManagedCourseDto[]>('/quizzes/manage/courses', { signal });
  return data;
}

export async function fetchQuizTopics(signal?: AbortSignal): Promise<QuizTopicDto[]> {
  const { data } = await http.get<QuizTopicDto[]>('/quizzes/manage/topics', { signal });
  return data;
}

export async function fetchManagedQuizzes(courseCode: string, signal?: AbortSignal): Promise<QuizSummaryDto[]> {
  const { data } = await http.get<QuizSummaryDto[]>('/quizzes/manage', { params: { courseCode }, signal });
  return data;
}

export async function createQuiz(request: CreateQuizRequest): Promise<QuizSummaryDto> {
  const { data } = await http.post<QuizSummaryDto>('/quizzes/manage', request);
  return data;
}

export async function fetchQuizDetail(quizId: number, signal?: AbortSignal): Promise<QuizDetailDto> {
  const { data } = await http.get<QuizDetailDto>(`/quizzes/manage/${quizId}`, { signal });
  return data;
}

export async function generateBankBatch(quizId: number, signal?: AbortSignal): Promise<GenerateBatchResponse> {
  const { data } = await http.post<GenerateBatchResponse>(`/quizzes/manage/${quizId}/bank/generate`, null, {
    signal,
  });
  return data;
}

export async function deleteBankQuestion(quizId: number, questionId: number): Promise<void> {
  await http.delete(`/quizzes/manage/${quizId}/questions/${questionId}`);
}

// ── HU-36: instrucciones, material y edición del banco ──────────────────

export async function updateGuidance(quizId: number, instructions: string): Promise<GuidanceDto> {
  const { data } = await http.put<GuidanceDto>(`/quizzes/manage/${quizId}/guidance`, { instructions });
  return data;
}

export async function addMaterialLink(quizId: number, url: string, crawl: boolean): Promise<MaterialDto> {
  const { data } = await http.post<MaterialDto>(`/quizzes/manage/${quizId}/materials/link`, { url, crawl });
  return data;
}

/** El navegador pone el límite multipart; sin esta cabecera axios convertiría el FormData a JSON. */
export async function addMaterialFile(quizId: number, file: File): Promise<MaterialDto> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await http.post<MaterialDto>(`/quizzes/manage/${quizId}/materials/file`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteMaterial(quizId: number, materialId: number): Promise<void> {
  await http.delete(`/quizzes/manage/${quizId}/materials/${materialId}`);
}

export async function updateBankQuestion(
  quizId: number,
  questionId: number,
  request: QuestionEditRequest,
): Promise<BankQuestionDto> {
  const { data } = await http.put<BankQuestionDto>(`/quizzes/manage/${quizId}/questions/${questionId}`, request);
  return data;
}

export async function proposeQuestionEdit(quizId: number, questionId: number, instruction: string, signal?: AbortSignal): Promise<AiProposalDto> {
  const { data } = await http.post<AiProposalDto>(
    `/quizzes/manage/${quizId}/questions/${questionId}/ai-proposal`,
    { instruction },
    { signal },
  );
  return data;
}

export async function publishQuiz(quizId: number): Promise<QuizSummaryDto> {
  const { data } = await http.post<QuizSummaryDto>(`/quizzes/manage/${quizId}/publish`);
  return data;
}

export async function setGradeVisibility(quizId: number, showGrade: boolean): Promise<QuizSummaryDto> {
  const { data } = await http.put<QuizSummaryDto>(`/quizzes/manage/${quizId}/grade-visibility`, { showGrade });
  return data;
}

export async function deleteQuiz(quizId: number): Promise<void> {
  await http.delete(`/quizzes/manage/${quizId}`);
}

export async function fetchQuizResults(quizId: number, signal?: AbortSignal): Promise<QuizResultsDto> {
  const { data } = await http.get<QuizResultsDto>(`/quizzes/manage/${quizId}/results`, { signal });
  return data;
}

/** El reporte lo arma el servidor a partir de los mismos resultados que muestra el panel. */
export async function fetchQuizReport(quizId: number, format: 'csv' | 'xlsx', signal?: AbortSignal): Promise<Blob> {
  const { data } = await http.get<Blob>(`/quizzes/manage/${quizId}/results.${format}`, {
    responseType: 'blob',
    signal,
  });
  return data;
}
