import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './features/auth/useAuth';
import AuthPage from './features/auth/AuthPage';
import ScanPage from './features/scan/ScanPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  const { user, signOut } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ScanPage user={user!} onSignOut={signOut} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <AuthPage />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
