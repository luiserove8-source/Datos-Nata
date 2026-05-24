import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAudit } from '../hooks/useAudit';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { registrar } = useAudit();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Buscar email por username en Firestore
      const q = query(collection(db, 'usuarios'), where('username', '==', username.trim()));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError('Usuario o contraseña incorrectos.');
        setLoading(false);
        return;
      }

      const perfil = snap.docs[0].data();
      if (perfil.activo === false) {
        setError('Tu cuenta está desactivada. Contacta al administrador.');
        setLoading(false);
        return;
      }

      await signInWithEmailAndPassword(auth, perfil.email, password);
      await registrar(snap.docs[0].id, username.trim(), 'LOGIN', 'Inicio de sesión');
      navigate('/dashboard');
    } catch {
      setError('Usuario o contraseña incorrectos.');
    }
    setLoading(false);
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow-lg border-0" style={{ width: '100%', maxWidth: 420 }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <i className="bi bi-journal-bookmark-fill text-primary" style={{ fontSize: '3rem' }}></i>
            <h3 className="fw-bold mt-2 text-primary">GestorActas</h3>
            <p className="text-muted small">Sistema de Numeración Consecutiva</p>
          </div>

          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-triangle-fill"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Usuario</label>
              <div className="input-group">
                <span className="input-group-text bg-primary text-white">
                  <i className="bi bi-person"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ingresa tu usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="form-label fw-semibold">Contraseña</label>
              <div className="input-group">
                <span className="input-group-text bg-primary text-white">
                  <i className="bi bi-lock"></i>
                </span>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary w-100 fw-semibold"
              disabled={loading}
            >
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-2"></span>Ingresando...</>
              ) : (
                <><i className="bi bi-box-arrow-in-right me-2"></i>Iniciar Sesión</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
