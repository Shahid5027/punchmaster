import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ToastProvider } from './context/ToastContext.js';
import Login from './pages/Login.js';
import EmployeeDashboard from './pages/EmployeeDashboard.js';
import PunchPage from './pages/PunchPage.js';
import AttendanceHistory from './pages/AttendanceHistory.js';
import AdminDashboard from './pages/AdminDashboard.js';
import ReportsPage from './pages/ReportsPage.js';

// Guard for protected routes (requires active session)
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRole?: 'admin' | 'employee' }> = ({
  children,
  allowedRole,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400 font-sans text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Securing session link...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    // If authenticated but role mismatch, bounce back to their standard role page
    return <Navigate to={user.role === 'admin' ? '/admin' : '/employee'} replace />;
  }

  return <>{children}</>;
};

// Route controller for authentication index page
const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/employee'} replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  return (
    <Routes>
      {/* Public/Auth Page */}
      <Route
        path="/login"
        element={
          <AuthRoute>
            <Login />
          </AuthRoute>
        }
      />

      {/* Protected Employee Workspace */}
      <Route
        path="/employee"
        element={
          <ProtectedRoute allowedRole="employee">
            <EmployeeDashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected Employee Attendance History */}
      <Route
        path="/employee/history"
        element={
          <ProtectedRoute allowedRole="employee">
            <AttendanceHistory />
          </ProtectedRoute>
        }
      />

      {/* Protected Punch Verification Page */}
      <Route
        path="/punch"
        element={
          <ProtectedRoute allowedRole="employee">
            <PunchPage />
          </ProtectedRoute>
        }
      />

      {/* Protected Admin Console */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected Admin Reports */}
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute allowedRole="admin">
            <ReportsPage />
          </ProtectedRoute>
        }
      />

      {/* Redirect wildcards */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
