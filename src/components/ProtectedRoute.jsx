import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { currentUser, userProfile } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (userProfile?.activo === false) {
    return (
      <div className="container mt-5 text-center">
        <div className="alert alert-danger">
          <i className="bi bi-ban fs-1 d-block mb-2"></i>
          Tu cuenta está desactivada. Contacta al administrador.
        </div>
      </div>
    );
  }
  return children;
}

export function AdminRoute({ children }) {
  const { currentUser, userProfile } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!userProfile?.isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}
