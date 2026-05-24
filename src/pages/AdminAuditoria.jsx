import { useEffect, useState } from 'react';
import { ref, query, orderByChild, limitToLast, onValue } from 'firebase/database';
import { db } from '../firebase';

const ACCIONES_COLOR = {
  LOGIN: 'success',
  LOGOUT: 'secondary',
  CREAR_ACTA: 'primary',
  CREAR_USUARIO: 'info',
  TOGGLE_USUARIO: 'warning',
};

const ACCIONES_ICON = {
  LOGIN: 'bi-box-arrow-in-right',
  LOGOUT: 'bi-box-arrow-right',
  CREAR_ACTA: 'bi-file-earmark-plus',
  CREAR_USUARIO: 'bi-person-plus',
  TOGGLE_USUARIO: 'bi-toggle-on',
};

export default function AdminAuditoria() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroUser, setFiltroUser] = useState('');

  useEffect(() => {
    const q = query(ref(db, 'auditoria'), orderByChild('timestamp'), limitToLast(500));
    const unsub = onValue(q, (snap) => {
      const items = [];
      snap.forEach((child) => items.push({ id: child.key, ...child.val() }));
      setLogs(items.reverse());
      setLoading(false);
    });
    return unsub;
  }, []);

  const formatTs = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  const logsFiltrados = logs.filter((l) => {
    const matchAccion = !filtroAccion || l.accion === filtroAccion;
    const matchUser = !filtroUser || l.username?.toLowerCase().includes(filtroUser.toLowerCase());
    return matchAccion && matchUser;
  });

  const acciones = [...new Set(logs.map((l) => l.accion))];

  return (
    <div className="container py-4">
      <h4 className="fw-bold mb-4">
        <i className="bi bi-shield-check me-2 text-primary"></i>Registro de Auditoría
      </h4>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body py-2">
          <div className="row g-2 align-items-center">
            <div className="col-sm-auto">
              <select
                className="form-select form-select-sm"
                value={filtroAccion}
                onChange={(e) => setFiltroAccion(e.target.value)}
              >
                <option value="">Todas las acciones</option>
                {acciones.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="col-sm-auto">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Filtrar por usuario..."
                value={filtroUser}
                onChange={(e) => setFiltroUser(e.target.value)}
              />
            </div>
            <div className="col-sm-auto ms-auto">
              <span className="badge bg-secondary">{logsFiltrados.length} registros</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : logsFiltrados.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>Sin registros.
            </div>
          ) : (
            <table className="table table-sm table-hover align-middle mb-0">
              <thead className="table-primary">
                <tr>
                  <th className="ps-3">Fecha y hora</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {logsFiltrados.map((log) => {
                  const color = ACCIONES_COLOR[log.accion] || 'light';
                  const icon = ACCIONES_ICON[log.accion] || 'bi-activity';
                  return (
                    <tr key={log.id}>
                      <td className="ps-3 text-muted small">{formatTs(log.timestamp)}</td>
                      <td>
                        <i className="bi bi-person-circle me-1 text-muted"></i>
                        {log.username || log.userId?.substring(0, 8)}
                      </td>
                      <td>
                        <span className={`badge bg-${color} text-${color === 'warning' || color === 'light' ? 'dark' : 'white'}`}>
                          <i className={`bi ${icon} me-1`}></i>
                          {log.accion}
                        </span>
                      </td>
                      <td className="text-muted small">{log.detalle || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
