import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/http', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
import http from '@/lib/http';
import {
  answerQuestion, createQuiz, deleteBankQuestion, deleteQuiz, fetchAttempt, fetchManagedCourses, fetchManagedQuizzes,
  fetchMyQuizzes, fetchQuizDetail, fetchQuizReport, fetchQuizResults, fetchQuizTopics, generateBankBatch, publishQuiz,
  reportIntegrityEvent, setGradeVisibility, startAttempt, submitAttempt,
  addMaterialFile, addMaterialLink, deleteMaterial, proposeQuestionEdit, updateBankQuestion, updateGuidance,
} from './quizService';

const data = { marker: true };
beforeEach(() => {
  vi.clearAllMocks();
  for (const method of [http.get, http.post, http.put, http.delete]) vi.mocked(method).mockResolvedValue({ data });
});

it('el estudiante nunca envía su curso ni su identidad: el servidor los toma de la sesión', async () => {
  const controller = new AbortController();
  expect(await fetchMyQuizzes(controller.signal)).toBe(data);
  expect(http.get).toHaveBeenCalledWith('/quizzes', { signal: controller.signal });
  expect(await startAttempt(7)).toBe(data);
  expect(http.post).toHaveBeenCalledWith('/quizzes/7/attempt');
  expect(await fetchAttempt(7)).toBe(data);
  expect(http.get).toHaveBeenCalledWith('/quizzes/7/attempt', { signal: undefined });
  expect(await submitAttempt(7)).toBe(data);
  expect(http.post).toHaveBeenCalledWith('/quizzes/7/attempt/submit');
});

it('responde por posición y permite dejar una pregunta en blanco', async () => {
  await answerQuestion(7, 2, 3);
  expect(http.put).toHaveBeenCalledWith('/quizzes/7/attempt/answers/2', { selectedOption: 3 });
  await answerQuestion(7, 2, null);
  expect(http.put).toHaveBeenLastCalledWith('/quizzes/7/attempt/answers/2', { selectedOption: null });
});

it('registra el incidente y devuelve el conteo del servidor', async () => {
  vi.mocked(http.post).mockResolvedValue({ data: { integrityEvents: 4 } });
  expect(await reportIntegrityEvent(7, 'FOCUS_LOST')).toBe(4);
  expect(http.post).toHaveBeenCalledWith('/quizzes/7/attempt/integrity', { type: 'FOCUS_LOST' });
});

it('consulta y modifica la gestión docente en sus rutas', async () => {
  const controller = new AbortController();
  expect(await fetchManagedCourses()).toBe(data);
  expect(http.get).toHaveBeenLastCalledWith('/quizzes/manage/courses', { signal: undefined });
  expect(await fetchQuizTopics()).toBe(data);
  expect(http.get).toHaveBeenLastCalledWith('/quizzes/manage/topics', { signal: undefined });
  expect(await fetchManagedQuizzes('CEDI-G1', controller.signal)).toBe(data);
  expect(http.get).toHaveBeenLastCalledWith('/quizzes/manage', { params: { courseCode: 'CEDI-G1' }, signal: controller.signal });
  expect(await fetchQuizDetail(9)).toBe(data);
  expect(http.get).toHaveBeenLastCalledWith('/quizzes/manage/9', { signal: undefined });
  expect(await fetchQuizResults(9)).toBe(data);
  expect(http.get).toHaveBeenLastCalledWith('/quizzes/manage/9/results', { signal: undefined });

  const request = { courseCode: 'CEDI-G1', title: 'Quiz', topics: ['tree/avl/insert'], questionsPerStudent: 3, studentCount: null,
    timeLimitMinutes: 30, opensAt: '2026-11-17T13:00:00.000Z', closesAt: '2026-11-19T13:00:00.000Z', showGrade: true, instructions: null };
  expect(await createQuiz(request)).toBe(data);
  expect(http.post).toHaveBeenLastCalledWith('/quizzes/manage', request);
  expect(await generateBankBatch(9, controller.signal)).toBe(data);
  expect(http.post).toHaveBeenLastCalledWith('/quizzes/manage/9/bank/generate', null, { signal: controller.signal });
  expect(await publishQuiz(9)).toBe(data);
  expect(http.post).toHaveBeenLastCalledWith('/quizzes/manage/9/publish');
  expect(await setGradeVisibility(9, false)).toBe(data);
  expect(http.put).toHaveBeenLastCalledWith('/quizzes/manage/9/grade-visibility', { showGrade: false });
  await deleteBankQuestion(9, 44);
  expect(http.delete).toHaveBeenLastCalledWith('/quizzes/manage/9/questions/44');
  await deleteQuiz(9);
  expect(http.delete).toHaveBeenLastCalledWith('/quizzes/manage/9');
});

it('descarga el reporte que arma el servidor en ambos formatos', async () => {
  const blob = new Blob(['x']);
  vi.mocked(http.get).mockResolvedValue({ data: blob });
  expect(await fetchQuizReport(9, 'csv')).toBe(blob);
  expect(http.get).toHaveBeenLastCalledWith('/quizzes/manage/9/results.csv', { responseType: 'blob', signal: undefined });
  await fetchQuizReport(9, 'xlsx');
  expect(http.get).toHaveBeenLastCalledWith('/quizzes/manage/9/results.xlsx', { responseType: 'blob', signal: undefined });
});

it('propaga un 403 en lugar de devolver datos viejos', async () => {
  const error = new Error('Forbidden');
  vi.mocked(http.get).mockRejectedValue(error);
  await expect(fetchQuizResults(9)).rejects.toBe(error);
  await expect(fetchMyQuizzes()).rejects.toBe(error);
});

it('HU-36: envía el tiempo visible acotado y gestiona instrucciones, material y edición', async () => {
  await answerQuestion(7, 2, 1, 12_345.6);
  expect(http.put).toHaveBeenLastCalledWith('/quizzes/7/attempt/answers/2', { selectedOption: 1, elapsedMs: 12_346 });
  await answerQuestion(7, 2, 1, -4);
  expect(http.put).toHaveBeenLastCalledWith('/quizzes/7/attempt/answers/2', { selectedOption: 1, elapsedMs: 0 });

  expect(await updateGuidance(9, 'Usa CyED1')).toBe(data);
  expect(http.put).toHaveBeenLastCalledWith('/quizzes/manage/9/guidance', { instructions: 'Usa CyED1' });
  expect(await addMaterialLink(9, 'https://cyedbooks.github.io/CyED1/', true)).toBe(data);
  expect(http.post).toHaveBeenLastCalledWith('/quizzes/manage/9/materials/link', { url: 'https://cyedbooks.github.io/CyED1/', crawl: true });
  const file = new File(['# Notas'], 'notas.md', { type: 'text/markdown' });
  expect(await addMaterialFile(9, file)).toBe(data);
  const [url, form, config] = vi.mocked(http.post).mock.lastCall!;
  expect(url).toBe('/quizzes/manage/9/materials/file');
  expect((form as FormData).get('file')).toBe(file);
  expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
  await deleteMaterial(9, 4);
  expect(http.delete).toHaveBeenLastCalledWith('/quizzes/manage/9/materials/4');

  const edit = { statement: 'S', options: ['a', 'b', 'c', 'd'], correctIndex: 1, explanation: '', hint: '', source: 'AI' as const };
  expect(await updateBankQuestion(9, 3, edit)).toBe(data);
  expect(http.put).toHaveBeenLastCalledWith('/quizzes/manage/9/questions/3', edit);
  const controller = new AbortController();
  expect(await proposeQuestionEdit(9, 3, 'Más difícil', controller.signal)).toBe(data);
  expect(http.post).toHaveBeenLastCalledWith('/quizzes/manage/9/questions/3/ai-proposal', { instruction: 'Más difícil' }, { signal: controller.signal });
});
