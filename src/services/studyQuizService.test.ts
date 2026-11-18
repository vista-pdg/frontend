import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/http', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
import http from '@/lib/http';
import {
  answerStudyQuestion, askStudyTutor, createStudyQuiz, deleteStudyQuiz, fetchStudyQuiz, fetchStudyQuizzes,
  fetchStudyTopics, generateStudyBatch, revealStudyHint, revealStudySolution,
} from './studyQuizService';
import { fetchAttemptReview } from './quizService';

const data = { marker: true };
beforeEach(() => {
  vi.clearAllMocks();
  for (const method of [http.get, http.post, http.put, http.delete]) vi.mocked(method).mockResolvedValue({ data });
});

it('HU-35: el autor nunca viaja en la petición; el servidor lo toma de la sesión', async () => {
  const controller = new AbortController();
  expect(await fetchStudyQuizzes(controller.signal)).toBe(data);
  expect(http.get).toHaveBeenCalledWith('/study-quizzes', { signal: controller.signal });
  expect(await fetchStudyTopics()).toBe(data);
  expect(http.get).toHaveBeenCalledWith('/study-quizzes/topics', { signal: undefined });
  expect(await createStudyQuiz({ title: '', topics: ['tree/avl/insert'], questionCount: 3 })).toBe(data);
  expect(http.post).toHaveBeenCalledWith('/study-quizzes', { title: '', topics: ['tree/avl/insert'], questionCount: 3 });
  expect(await fetchStudyQuiz(4)).toBe(data);
  expect(http.get).toHaveBeenCalledWith('/study-quizzes/4', { signal: undefined });
  expect(await generateStudyBatch(4, controller.signal)).toBe(data);
  expect(http.post).toHaveBeenCalledWith('/study-quizzes/4/generate', null, { signal: controller.signal });
  await deleteStudyQuiz(4);
  expect(http.delete).toHaveBeenCalledWith('/study-quizzes/4');
});

it('HU-35: pista, solución, respuesta y tutor van por posición', async () => {
  await answerStudyQuestion(4, 2, 1);
  expect(http.put).toHaveBeenCalledWith('/study-quizzes/4/questions/2/answer', { selectedOption: 1 });
  await revealStudyHint(4, 2);
  expect(http.post).toHaveBeenCalledWith('/study-quizzes/4/questions/2/hint');
  await revealStudySolution(4, 3);
  expect(http.post).toHaveBeenCalledWith('/study-quizzes/4/questions/3/solution');
  await askStudyTutor(4, 2, '¿Por qué?', [{ role: 'student', text: 'Hola' }]);
  expect(http.post).toHaveBeenCalledWith('/study-quizzes/4/questions/2/tutor', { message: '¿Por qué?', history: [{ role: 'student', text: 'Hola' }] });
});

it('HU-35: la revisión es una lectura del intento propio', async () => {
  expect(await fetchAttemptReview(9)).toBe(data);
  expect(http.get).toHaveBeenCalledWith('/quizzes/9/attempt/review', { signal: undefined });
});
