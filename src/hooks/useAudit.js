import { ref, push, serverTimestamp } from 'firebase/database';
import { db } from '../firebase';

export function useAudit() {
  const registrar = async (userId, username, accion, detalle = '') => {
    try {
      await push(ref(db, 'auditoria'), {
        userId,
        username,
        accion,
        detalle,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.error('Error registrando auditoría:', e);
    }
  };
  return { registrar };
}
