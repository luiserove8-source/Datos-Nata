import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';

export default function VerActa() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [acta, setActa] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      const snap = await get(ref(db, `actas/${id}`));
      if (snap.exists()) setActa({ id: snap.key, ...snap.val() });
      setLoading(false);
    };
    cargar();
  }, [id]);

  const formatFecha = (fecha) => {
    if (!fecha) return '—';
    const [y, m, d] = fecha.split('-');
    const date = new Date(+y, +m - 1, +d);
    return date.toLocaleDateString('es-CO', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });
  };

  const formatTs = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary"></div>
      </div>
    );
  }

  if (!acta) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-danger">Acta no encontrada.</div>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Volver</button>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-lg-7">
          <div className="d-flex align-items-center gap-2 mb-4">
            <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/dashboard')}>
              <i className="bi bi-arrow-left"></i>
            </button>
            <h4 className="fw-bold mb-0">Detalle del Acta</h4>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-primary text-white py-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <i className="bi bi-file-earmark-text fs-3"></i>
                <div>
                  <div className="fs-4 fw-bold">Acta #{acta.numeroConsecutivo}</div>
                  <div className="small opacity-75">Documento oficial</div>
                </div>
              </div>
              <span className="badge bg-danger fs-6">
                <i className="bi bi-lock-fill me-1"></i>Bloqueada
              </span>
            </div>
            <div className="card-body p-4">
              <div className="row g-3">
                <div className="col-12">
                  <label className="text-muted small fw-semibold text-uppercase">Descripción</label>
                  <p className="mt-1 fs-6 border rounded p-3 bg-light mb-0">{acta.descripcion}</p>
                </div>
                <div className="col-sm-6">
                  <label className="text-muted small fw-semibold text-uppercase">Fecha del Acta</label>
                  <p className="mt-1 fw-semibold text-capitalize">{formatFecha(acta.fecha)}</p>
                </div>
                <div className="col-sm-6">
                  <label className="text-muted small fw-semibold text-uppercase">Creado por</label>
                  <p className="mt-1">
                    <i className="bi bi-person-circle me-1 text-primary"></i>
                    {acta.creadoPor}
                  </p>
                </div>
                <div className="col-sm-6">
                  <label className="text-muted small fw-semibold text-uppercase">Fecha de Registro</label>
                  <p className="mt-1">{formatTs(acta.creadoEn)}</p>
                </div>
                <div className="col-sm-6">
                  <label className="text-muted small fw-semibold text-uppercase">Estado</label>
                  <p className="mt-1">
                    <span className="badge bg-danger p-2">
                      <i className="bi bi-lock-fill me-1"></i>Bloqueada — No editable
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
