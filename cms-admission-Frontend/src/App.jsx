import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import StudentBackground from './components/StudentBackground';
import ApplicationPreviewPage from './pages/ApplicationPreviewPage';
import ApplicationSuccessPage from './pages/ApplicationSuccessPage';
import AdmissionPaymentPage from './pages/AdmissionPaymentPage';
import LoginPage from './pages/LoginPage';
import OfficerApplicationDetailPage from './pages/OfficerApplicationDetailPage';
import OfficerDashboardPage from './pages/OfficerDashboardPage';
import OfficerSettingsPage from './pages/OfficerSettingsPage';
import RegisterPage from './pages/RegisterPage';
import StudentWelcomePage from './pages/StudentWelcomePage';
import VCDashboardPage from './pages/VCDashboardPage';
import VCDetailPage from './pages/VCDetailPage';
import './App.css';

function ProtectedRoute({ children, allowedRole }) {
  const { auth } = useAppContext();

  if (auth.role !== allowedRole) {
    return <Navigate to={`/login/${allowedRole}`} replace />;
  }

  return children;
}

function AppRoutes() {
  const { pathname } = useLocation();
  const showStudentBackground = pathname === '/'
    || pathname.startsWith('/register')
    || pathname.startsWith('/application-')
    || pathname === '/payment';

  return (
    <>
      {showStudentBackground ? <StudentBackground /> : null}
      <Routes>
        <Route path="/" element={<StudentWelcomePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/application-preview" element={<ApplicationPreviewPage />} />
        <Route path="/payment" element={<AdmissionPaymentPage />} />
        <Route path="/application-success" element={<ApplicationSuccessPage />} />
        <Route path="/login/:role" element={<LoginPage />} />

        <Route path="/officer/dashboard" element={<ProtectedRoute allowedRole="officer"><OfficerDashboardPage /></ProtectedRoute>} />
        <Route path="/officer/application/:id" element={<ProtectedRoute allowedRole="officer"><OfficerApplicationDetailPage /></ProtectedRoute>} />
        <Route path="/officer/settings" element={<ProtectedRoute allowedRole="officer"><OfficerSettingsPage /></ProtectedRoute>} />
        <Route path="/officer" element={<Navigate to="/officer/dashboard" replace />} />

        <Route path="/vc/dashboard" element={<ProtectedRoute allowedRole="vc"><VCDashboardPage /></ProtectedRoute>} />
        <Route path="/vc/confirmed/:id" element={<ProtectedRoute allowedRole="vc"><VCDetailPage /></ProtectedRoute>} />
        <Route path="/vc" element={<Navigate to="/vc/dashboard" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}
