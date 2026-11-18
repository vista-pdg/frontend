import http from '@/lib/http';
import type {
  CreateStudyQuizRequest,
  GenerateBatchResponse,
  QuizTopicDto,
  StudyQuestionDto,
  StudyQuizDto,
  StudyQuizSummaryDto,
  TutorReplyDto,
  TutorTurn,
} from '@/types/quiz';

/** Quizzes de estudio (HU-35): solo los ve su autor; el servidor lo toma de la sesión. */

export async function fetchStudyQuizzes(signal?: AbortSignal): Promise<StudyQuizSummaryDto[]> {
  const { data } = await http.get<StudyQuizSummaryDto[]>('/study-quizzes', { signal });
  return data;
}

export async function fetchStudyTopics(signal?: AbortSignal): Promise<QuizTopicDto[]> {
  const { data } = await http.get<QuizTopicDto[]>('/study-quizzes/topics', { signal });
  return data;
}

export async function createStudyQuiz(request: CreateStudyQuizRequest): Promise<StudyQuizSummaryDto> {
  const { data } = await http.post<StudyQuizSummaryDto>('/study-quizzes', request);
  return data;
}

export async function fetchStudyQuiz(id: number, signal?: AbortSignal): Promise<StudyQuizDto> {
  const { data } = await http.get<StudyQuizDto>(`/study-quizzes/${id}`, { signal });
  return data;
}

/** Cada lote consume un mensaje de la cuota diaria del asistente. */
export async function generateStudyBatch(id: number, signal?: AbortSignal): Promise<GenerateBatchResponse> {
  const { data } = await http.post<GenerateBatchResponse>(`/study-quizzes/${id}/generate`, null, { signal });
  return data;
}

/** HU-36: `elapsedMs` es el tiempo que la pregunta estuvo visible antes de comprobarla. */
export async function answerStudyQuestion(id: number, position: number, selectedOption: number, elapsedMs?: number): Promise<StudyQuestionDto> {
  const { data } = await http.put<StudyQuestionDto>(`/study-quizzes/${id}/questions/${position}/answer`, {
    selectedOption,
    ...(elapsedMs === undefined ? {} : { elapsedMs: Math.max(0, Math.round(elapsedMs)) }),
  });
  return data;
}

export async function revealStudyHint(id: number, position: number): Promise<StudyQuestionDto> {
  const { data } = await http.post<StudyQuestionDto>(`/study-quizzes/${id}/questions/${position}/hint`);
  return data;
}

export async function revealStudySolution(id: number, position: number): Promise<StudyQuestionDto> {
  const { data } = await http.post<StudyQuestionDto>(`/study-quizzes/${id}/questions/${position}/solution`);
  return data;
}

/** Cada mensaje consume un mensaje de la cuota diaria; la conversación vive en el navegador. */
export async function askStudyTutor(id: number, position: number, message: string, history: TutorTurn[]): Promise<TutorReplyDto> {
  const { data } = await http.post<TutorReplyDto>(`/study-quizzes/${id}/questions/${position}/tutor`, { message, history });
  return data;
}

export async function deleteStudyQuiz(id: number): Promise<void> {
  await http.delete(`/study-quizzes/${id}`);
}
