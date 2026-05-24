import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { userProfile } = useAuth();
  const [actas, setActas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'actas'), orderBy('numeroConsecutivo', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setActas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const ultimaActa = actas.length > 0 ? actas[0] : null;
  const proximoNumero = ultimaActa ? ultimaActa.numeroConsecutivo + 1 : 1;

  const actasFiltradas = actas.filter((a) => {
    const b = busqueda.toLowerCase();
    return (
      String(a.numeroConsecutivo).includes(b) ||
      a.descripcion?.toLowerCase().includes(b) ||
      a.creadoPor?.toLowerCase().includes(b)
    );
  });

  const formatFecha = (fecha) => {
    if (!fecha) return '—';
    const d = fecha.toDate ? fecha.toDate() : new Date(fecha);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="container py-4">
      {/* Stats */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-md-4">
          <div className="card border-0 bg-primary text-white shadow-sm">
            <div className="card-body d-flex align-items-center gap-3">
              <i className="bi bi-hash fs-2"></i>
              <div>
                <div className="fw-bold fs-4">{ultimaActa?.numeroConsecutivo ?? 0}</div>
                <div className="small opacity-75">Último número</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-md-4">
          <div className="card border-0 bg-success text-white shadow-sm">
            <div className="card-body d-flex align-items-center gap-3">
              <i className="bi bi-file-earmark-plus fs-2"></i>
              <div>
                <div className="fw-bold fs-4">{proximoNumero}</div>
                <div className="small opacity-75">Próximo número</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-md-4">
          <div className="card border-0 bg-info text-white shadow-sm">
            <div className="card-body d-flex align-items-center gap-3">
              <i className="bi bi-archive fs-2"></i>
              <div>
                <div className="fw-bold fs-4">{actas.length}</div>
                <div className="small opacity-75">Total actas</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Acción + búsqueda */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <h5 className="fw-bold mb-0">
          <i className="bi bi-table me-2 text-primary"></i>Registro de Actas
        </h5>
        <div className="d-flex gap-2">
          <div className="input-group" style={{ width: 250 }}>
            <span className="input-group-text"><i className="bi bi-search"></i></span>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <Link to="/actas/nueva" className="btn btn-primary">
            <i className="bi bi-plus-lg me-1"></i>Nueva Acta
          </Link>
        </div>
      </div>

      {/* Tabla */}
      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
              <div className="mt-2 text-muted">Cargando actas...</div>
            </div>
          ) : actasFiltradas.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              {busqueda ? 'No se encontraron resultados.' : 'No hay actas registradas aún.'}
            </div>
          ) : (
            <table className="table table-hover align-middle mb-0">
              <thead className="table-primary">
                <tr>
                  <th className="ps-3"># Acta</th>
                  <th>Descripción</th>
                  <th>Fecha</th>
                  <th>Creado por</th>
                  <th>Estado</th>
                  <th className="text-end pe-3">Acción</th>
                </tr>
              </thead>
              <tbody>
                {actasFiltradas.map((acta) => (
                  <tr key={acta.id}>
                    <td className="ps-3">
                      <span className="badge bg-primary fs-6">#{acta.numeroConsecutivo}</span>
                    </td>
                    <td>
                      <span className="text-truncate d-inline-block" style={{ maxWidth: 300 }}>
                        {acta.descripcion}
                      </span>
                    </td>
                    <td>{formatFecha(acta.fecha)}</td>
                    <td>
                      <i className="bi bi-person-circle me-1 text-muted"></i>
                      {acta.creadoPor}
                    </td>
                    <td>
                      {acta.bloqueada ? (
                        <span className="badge bg-danger">
                          <i className="bi bi-lock-fill me-1"></i>Bloqueada
                        </span>
                      ) : (
                        <span className="badge bg-success">Activa</span>
                      )}
                    </td>
                    <td className="text-end pe-3">
                      <Link to={`/actas/${acta.id}`} className="btn btn-sm btn-outline-primary">
                        <i className="bi bi-eye me-1"></i>Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
