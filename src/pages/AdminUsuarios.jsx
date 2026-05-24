import { useEffect, useState } from 'react';
import { ref, onValue, update, set, orderByChild, query } from 'firebase/database';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useAudit } from '../hooks/useAudit';

function ModalNuevoUsuario({ onClose, onCreado }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setGuardando(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await set(ref(db, `usuarios/${cred.user.uid}`), {
        uid: cred.user.uid,
        username: username.trim(),
        email: email.trim().toLowerCase(),
        isAdmin,
        activo: true,
        creadoEn: Date.now(),
      });
      onCreado(username.trim());
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('El correo ya está en uso.');
      else setError('Error al crear el usuario: ' + err.message);
    }
    setGuardando(false);
  };

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content border-0 shadow">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title"><i className="bi bi-person-plus me-2"></i>Nuevo Usuario</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && <div className="alert alert-danger">{error}</div>}
              <div className="mb-3">
                <label className="form-label fw-semibold">Nombre de usuario</label>
                <input type="text" className="form-control" value={username}
                  onChange={(e) => setUsername(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Correo electrónico</label>
                <input type="email" className="form-control" value={email}
                  onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Contraseña</label>
                <input type="password" className="form-control" value={password}
                  onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                <div className="form-text">Mínimo 6 caracteres.</div>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="checkbox" id="isAdmin"
                  checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
                <label className="form-check-label" htmlFor="isAdmin">Administrador</label>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={guardando}>
                {guardando ? 'Creando...' : 'Crear Usuario'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsuarios() {
  const { currentUser, userProfile } = useAuth();
  const { registrar } = useAudit();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalNuevo, setModalNuevo] = useState(false);

  useEffect(() => {
    const q = query(ref(db, 'usuarios'), orderByChild('creadoEn'));
    const unsub = onValue(q, (snap) => {
      const items = [];
      snap.forEach((child) => items.push({ id: child.key, ...child.val() }));
      setUsuarios(items.reverse());
      setLoading(false);
    });
    return unsub;
  }, []);

  const toggleActivo = async (user) => {
    if (user.uid === currentUser.uid) {
      alert('No puedes desactivarte a ti mismo.');
      return;
    }
    await update(ref(db, `usuarios/${user.id}`), { activo: !user.activo });
    const estado = !user.activo ? 'activado' : 'desactivado';
    await registrar(currentUser.uid, userProfile?.username, 'TOGGLE_USUARIO',
      `Usuario "${user.username}" ${estado}`);
  };

  const handleCreado = async (username) => {
    await registrar(currentUser.uid, userProfile?.username, 'CREAR_USUARIO',
      `Usuario "${username}" creado`);
    setModalNuevo(false);
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold mb-0">
          <i className="bi bi-people me-2 text-primary"></i>Gestión de Usuarios
        </h4>
        <button className="btn btn-primary" onClick={() => setModalNuevo(true)}>
          <i className="bi bi-person-plus me-1"></i>Nuevo Usuario
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : (
            <table className="table table-hover align-middle mb-0">
              <thead className="table-primary">
                <tr>
                  <th className="ps-3">Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th className="text-end pe-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td className="ps-3">
                      <i className="bi bi-person-circle me-2 text-muted"></i>
                      <strong>{u.username}</strong>
                      {u.uid === currentUser.uid && (
                        <span className="badge bg-secondary ms-2">Tú</span>
                      )}
                    </td>
                    <td className="text-muted">{u.email}</td>
                    <td>
                      {u.isAdmin ? (
                        <span className="badge bg-warning text-dark">
                          <i className="bi bi-shield-fill me-1"></i>Admin
                        </span>
                      ) : (
                        <span className="badge bg-light text-dark border">Usuario</span>
                      )}
                    </td>
                    <td>
                      {u.activo !== false ? (
                        <span className="badge bg-success">
                          <i className="bi bi-check-circle me-1"></i>Activo
                        </span>
                      ) : (
                        <span className="badge bg-danger">
                          <i className="bi bi-x-circle me-1"></i>Inactivo
                        </span>
                      )}
                    </td>
                    <td className="text-end pe-3">
                      <button
                        className={`btn btn-sm ${u.activo !== false ? 'btn-outline-danger' : 'btn-outline-success'}`}
                        onClick={() => toggleActivo(u)}
                        disabled={u.uid === currentUser.uid}
                      >
                        {u.activo !== false ? (
                          <><i className="bi bi-ban me-1"></i>Desactivar</>
                        ) : (
                          <><i className="bi bi-check me-1"></i>Activar</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalNuevo && (
        <ModalNuevoUsuario
          onClose={() => setModalNuevo(false)}
          onCreado={handleCreado}
        />
      )}
    </div>
  );
}
