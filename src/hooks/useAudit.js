import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export function useAudit() {
  const registrar = async (userId, username, accion, detalle = '') => {
    try {
      await addDoc(collection(db, 'auditoria'), {
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
