import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/AuthProvider';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { RequireAuth } from './components/shared/RequireAuth';
import { AppShell } from './components/shared/AppShell';
import { DashboardOverview } from './pages/dashboard/DashboardOverview';
import { JobsPage } from './pages/jobs/JobsPage';
import { JobForm } from './pages/jobs/JobForm';
import { JobDetailsPage } from './pages/jobs/JobDetailsPage';
import { CandidateListPage } from './features/candidates/CandidateListPage';
import { CandidateProfilePage } from './features/candidates/CandidateProfilePage';
import { SingleResumeUploadUI } from './features/candidates/SingleResumeUploadUI';
import { PipelineBoardPage } from './features/pipeline/PipelineBoardPage';
import { InterviewsPage } from './features/interviews/InterviewsPage';
import { OffersPage } from './features/offers/OffersPage';
import { CandidateToolsPage } from './features/candidates/CandidateToolsPage';
import { ComingSoonPage } from './pages/placeholder/ComingSoonPage';
import { PortalOfferPage } from './pages/portal/PortalOfferPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* Candidate offer portal — public, token-gated, outside RequireAuth (Phase 8) */}
          <Route path="/portal/offers/:token" element={<PortalOfferPage />} />

          {/* Protected App Routes */}
          <Route element={<RequireAuth />}>
            <Route path="/app" element={<AppShell />}>
              <Route path="dashboard" element={<DashboardOverview />} />
              <Route path="jobs" element={<JobsPage />} />
              <Route path="jobs/new" element={<JobForm />} />
              <Route path="jobs/:id" element={<JobDetailsPage />} />
              <Route path="jobs/:id/edit" element={<JobForm />} />
              <Route path="candidates" element={<CandidateListPage />} />
              <Route path="candidates/upload" element={<SingleResumeUploadUI />} />
              <Route path="candidates/:id" element={<CandidateProfilePage />} />
              <Route path="candidates/tools" element={<CandidateToolsPage />} />
              <Route path="pipeline/:jobId" element={<PipelineBoardPage />} />
              <Route path="interviews" element={<InterviewsPage />} />
              <Route path="offers" element={<OffersPage />} />
              {/* Sidebar sections not built yet — honest placeholders so these
                  links don't fall through to the login-redirect catch-all */}
              <Route path="schedule" element={<ComingSoonPage title="Schedule" />} />
              <Route path="recruitment" element={<ComingSoonPage title="Ongoing Recruitment" />} />
              <Route path="analytics" element={<ComingSoonPage title="Analytics" />} />
              <Route path="reports" element={<ComingSoonPage title="Reports" />} />
              {/* Other protected routes will go here */}
            </Route>
          </Route>
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
