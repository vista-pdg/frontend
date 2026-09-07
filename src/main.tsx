import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { WelcomePage } from './pages/WelcomePage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { RedirectIfAuthenticated, RequireAuth, RequireRole } from './routes/guards.tsx';

document.documentElement.classList.add('dark');

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
                <RequireRole role="TEACHER">
                  <AnalyticsPage />
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
