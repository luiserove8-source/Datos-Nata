import { Link, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useAudit } from '../hooks/useAudit';

export default function Navbar() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { registrar } = useAudit();

  const handleLogout = async () => {
    await registrar(currentUser.uid, userProfile?.username, 'LOGOUT', 'Cierre de sesión');
    await signOut(auth);
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary sticky-top shadow-sm">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/dashboard">
          <i className="bi bi-journal-bookmark-fill me-2"></i>
          GestorActas
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse"
          data-bs-target="#navbarMain">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarMain">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/dashboard')}`} to="/dashboard">
                <i className="bi bi-grid-3x3-gap me-1"></i>Inicio
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/actas/nueva')}`} to="/actas/nueva">
                <i className="bi bi-plus-circle me-1"></i>Nueva Acta
              </Link>
            </li>
            {userProfile?.isAdmin && (
              <>
                <li className="nav-item">
                  <Link className={`nav-link ${isActive('/admin/usuarios')}`} to="/admin/usuarios">
                    <i className="bi bi-people me-1"></i>Usuarios
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-link ${isActive('/admin/auditoria')}`} to="/admin/auditoria">
                    <i className="bi bi-shield-check me-1"></i>Auditoría
                  </Link>
                </li>
              </>
            )}
          </ul>
          <div className="navbar-nav">
            <span className="nav-link text-warning">
              <i className="bi bi-person-circle me-1"></i>
              {userProfile?.username}
              {userProfile?.isAdmin && <span className="badge bg-warning text-dark ms-1">Admin</span>}
            </span>
            <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right me-1"></i>Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
