import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { RequireAuth } from './components/shared/RequireAuth';
import { AppShell } from './components/shared/AppShell';
import { DashboardOverview } from './pages/dashboard/DashboardOverview';
import { JobsPage } from './pages/jobs/JobsPage';
import { JobForm } from './pages/jobs/JobForm';
import { JobDetailsPage } from './pages/jobs/JobDetailsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected App Routes */}
          <Route element={<RequireAuth />}>
            <Route path="/app" element={<AppShell />}>
              <Route path="dashboard" element={<DashboardOverview />} />
              <Route path="jobs" element={<JobsPage />} />
              <Route path="jobs/new" element={<JobForm />} />
              <Route path="jobs/:id" element={<JobDetailsPage />} />
              <Route path="jobs/:id/edit" element={<JobForm />} />
              {/* Other protected routes will go here */}
            </Route>
          </Route>
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
