import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, orderBy, limit, getDocs,
  addDoc, serverTimestamp, runTransaction, doc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useAudit } from '../hooks/useAudit';

export default function NuevaActa() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const { registrar } = useAudit();

  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState('');
  const [ultimaActa, setUltimaActa] = useState(null);
  const [proximoNumero, setProximoNumero] = useState(1);
  const [alerta, setAlerta] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [mostrarConfirm, setMostrarConfirm] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(true);

  useEffect(() => {
    const cargarUltima = async () => {
      const q = query(collection(db, 'actas'), orderBy('numeroConsecutivo', 'desc'), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setUltimaActa(data);
        setProximoNumero(data.numeroConsecutivo + 1);
      }
      setLoadingInfo(false);
    };
    cargarUltima();
  }, []);

  const handleFechaChange = (e) => {
    const f = e.target.value;
    setFecha(f);
    setAlerta(null);
    setMostrarConfirm(false);

    if (f && ultimaActa) {
      const fechaSeleccionada = new Date(f + 'T00:00:00');
      const fechaUltima = ultimaActa.fecha?.toDate
        ? ultimaActa.fecha.toDate()
        : new Date(ultimaActa.fecha + 'T00:00:00');
      fechaUltima.setHours(0, 0, 0, 0);
      fechaSeleccionada.setHours(0, 0, 0, 0);

      if (fechaSeleccionada < fechaUltima) {
        const fmtSel = fechaSeleccionada.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const fmtUlt = fechaUltima.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
        setAlerta(
          `La fecha seleccionada (${fmtSel}) es anterior a la del último acta #${ultimaActa.numeroConsecutivo} (${fmtUlt}).`
        );
        setMostrarConfirm(true);
      }
    }
  };

  const guardarActa = async () => {
    if (!descripcion.trim() || !fecha) return;
    setGuardando(true);

    try {
      const contadorRef = doc(db, 'contadores', 'actas');
      let nuevoNumero;

      await runTransaction(db, async (transaction) => {
        const contadorSnap = await transaction.get(contadorRef);
        nuevoNumero = (contadorSnap.exists() ? contadorSnap.data().ultimo : 0) + 1;
        transaction.set(contadorRef, { ultimo: nuevoNumero });

        const actaRef = doc(collection(db, 'actas'));
        transaction.set(actaRef, {
          numeroConsecutivo: nuevoNumero,
          descripcion: descripcion.trim(),
          fecha: new Date(fecha + 'T00:00:00'),
          userId: currentUser.uid,
          creadoPor: userProfile?.username,
          creadoEn: serverTimestamp(),
          bloqueada: true,
        });
      });

      await registrar(
        currentUser.uid,
        userProfile?.username,
        'CREAR_ACTA',
        `Acta #${nuevoNumero} creada con fecha ${fecha}`
      );

      navigate('/dashboard');
    } catch (e) {
      console.error(e);
      alert('Error al guardar el acta. Intenta de nuevo.');
    }
    setGuardando(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mostrarConfirm && alerta) return; // espera confirmación
    guardarActa();
  };

  if (loadingInfo) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary"></div>
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
            <h4 className="fw-bold mb-0">Nueva Acta</h4>
          </div>

          {/* Info próximo número */}
          <div className="card border-0 bg-primary text-white mb-4 shadow-sm">
            <div className="card-body d-flex align-items-center gap-3">
              <i className="bi bi-hash display-5 opacity-75"></i>
              <div>
                <div className="display-6 fw-bold">{proximoNumero}</div>
                <div className="small opacity-75">Número que se asignará a esta acta</div>
              </div>
              <div className="ms-auto text-end">
                {ultimaActa && (
                  <div className="small opacity-75">
                    <div>Último: <strong>#{ultimaActa.numeroConsecutivo}</strong></div>
                    <div>
                      Fecha:{' '}
                      <strong>
                        {(ultimaActa.fecha?.toDate
                          ? ultimaActa.fecha.toDate()
                          : new Date(ultimaActa.fecha + 'T00:00:00')
                        ).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Alerta de fecha regresiva */}
          {alerta && (
            <div className="alert alert-warning border-warning shadow-sm d-flex gap-3 align-items-start">
              <i className="bi bi-exclamation-triangle-fill fs-4 text-warning mt-1 flex-shrink-0"></i>
              <div>
                <strong>Alerta de fecha:</strong>
                <p className="mb-2">{alerta}</p>
                {mostrarConfirm && (
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-warning btn-sm fw-semibold"
                      onClick={guardarActa}
                      disabled={guardando}
                    >
                      <i className="bi bi-check-lg me-1"></i>Confirmar y continuar
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => { setAlerta(null); setMostrarConfirm(false); setFecha(''); }}
                    >
                      Cambiar fecha
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Formulario */}
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-card-text me-1 text-primary"></i>Descripción
                  </label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Ingresa la descripción del acta..."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    required
                    maxLength={1000}
                  />
                  <div className="text-end text-muted small mt-1">{descripcion.length}/1000</div>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-calendar-date me-1 text-primary"></i>Fecha del Acta
                  </label>
                  <input
                    type="date"
                    className={`form-control ${alerta ? 'border-warning' : ''}`}
                    value={fecha}
                    onChange={handleFechaChange}
                    required
                  />
                </div>

                <div className="alert alert-info border-info small">
                  <i className="bi bi-info-circle me-2"></i>
                  Una vez creada, el acta quedará <strong>bloqueada</strong> y no podrá modificarse.
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary flex-fill fw-semibold"
                    disabled={guardando || mostrarConfirm}
                  >
                    {guardando ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span>Guardando...</>
                    ) : (
                      <><i className="bi bi-lock-fill me-2"></i>Crear y Bloquear Acta</>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/dashboard')}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
