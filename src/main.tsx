import { initializeTheme } from './lib/theme';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { WelcomePage } from './pages/WelcomePage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';
import { QuizListPage } from './pages/QuizListPage.tsx';
import { QuizExamPage } from './pages/QuizExamPage.tsx';
import { QuizManagementPage } from './pages/QuizManagementPage.tsx';
import { QuizDetailPage } from './pages/QuizDetailPage.tsx';
import { QuizReviewPage } from './pages/QuizReviewPage.tsx';
import { StudyQuizNewPage } from './pages/StudyQuizNewPage.tsx';
import { StudyQuizPage } from './pages/StudyQuizPage.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { RedirectIfAuthenticated, RequireAuth, RequireRole } from './routes/guards.tsx';

initializeTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <RedirectIfAuthenticated>
                <WelcomePage />
              </RedirectIfAuthenticated>
            }
          />
          <Route
            path="/"
            element={
              <RequireAuth>
                <App />
              </RequireAuth>
            }
          />
          <Route
            path="/analytics"
            element={
              <RequireAuth>
                <RequireRole role={['TEACHER', 'ADMIN']}>
                  <AnalyticsPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/quizzes"
            element={
              <RequireAuth>
                <QuizListPage />
              </RequireAuth>
            }
          />
          <Route
            path="/quizzes/:quizId/presentar"
            element={
              <RequireAuth>
                <QuizExamPage />
              </RequireAuth>
            }
          />
          <Route
            path="/quizzes/:quizId/revision"
            element={
              <RequireAuth>
                <QuizReviewPage />
              </RequireAuth>
            }
          />
          <Route
            path="/quizzes/estudio/nuevo"
            element={
              <RequireAuth>
                <RequireRole role="STUDENT">
                  <StudyQuizNewPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/quizzes/estudio/:id"
            element={
              <RequireAuth>
                <RequireRole role="STUDENT">
                  <StudyQuizPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/docencia/quizzes"
            element={
              <RequireAuth>
                <RequireRole role={['TEACHER', 'ADMIN']}>
                  <QuizManagementPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/docencia/quizzes/:quizId"
            element={
              <RequireAuth>
                <RequireRole role={['TEACHER', 'ADMIN']}>
                  <QuizDetailPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <RequireRole role="ADMIN">
                  <AdminPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
);
