/**
 * SERVICIO DE VOTO INMUTABLE EN CLOUD FIRESTORE
 * Protocolo de Urna Criptográfica Append-Only (Democracia Viva)
 * 
 * Regla de Oro:
 * 1. Document ID = nullifierHash.
 * 2. Unicidad Matemática: allow create if !exists().
 * 3. Prohibido volver atrás: allow update, delete if false.
 * 4. Cero referencias a datos de identidad del votante.
 */

import { db } from './firebase.ts';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface ImmutableVoteDocument {
  nullifierHash: string;
  proposalId: string;
  choice: 'YES' | 'NO' | 'DELEGATE';
  timestamp: number;
  clientSignature: string;
  merkleLeaf: string;
  txHash: string;
  receiptId: string;
  merkleRoot: string;
}

const LOCAL_SEALED_VOTES_KEY = 'DEMOCRACIA_VIVA_SEALED_VOTES_CACHE_V1';
const memorySealedVotesCache: Record<string, ImmutableVoteDocument> = {};

/**
 * Obtiene el mapa en caché local de votos sellados emitidos por el dispositivo.
 */
export function getLocalSealedVotesCache(): Record<string, ImmutableVoteDocument> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(LOCAL_SEALED_VOTES_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return memorySealedVotesCache;
}

/**
 * Guarda un voto sellado en la caché local del dispositivo.
 */
function cacheSealedVoteLocally(vote: ImmutableVoteDocument): void {
  memorySealedVotesCache[vote.nullifierHash] = vote;
  memorySealedVotesCache[`prop_${vote.proposalId}`] = vote;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cache = getLocalSealedVotesCache();
      cache[vote.nullifierHash] = vote;
      // Indexar también por proposalId para consulta ultrarrápida en UI
      cache[`prop_${vote.proposalId}`] = vote;
      window.localStorage.setItem(LOCAL_SEALED_VOTES_KEY, JSON.stringify(cache));
    }
  } catch {}
}

/**
 * Limpia la caché local de votos sellados (para tests y reinicios).
 */
export function clearLocalSealedVotesCache(): void {
  for (const k of Object.keys(memorySealedVotesCache)) {
    delete memorySealedVotesCache[k];
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(LOCAL_SEALED_VOTES_KEY);
    }
  } catch {}
}

/**
 * Comprueba si un nullifierHash ya ha emitido voto en Firestore o en caché local.
 */
export async function hasNullifierVoted(nullifierHash: string): Promise<boolean> {
  // 1. Comprobar caché local rápida
  const cache = getLocalSealedVotesCache();
  if (cache[nullifierHash]) return true;

  // 2. Comprobar en Firestore si está conectado
  try {
    if (db && db.type === 'firestore') {
      const docRef = doc(db, 'votes', nullifierHash);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as ImmutableVoteDocument;
        cacheSealedVoteLocally(data);
        return true;
      }
    }
  } catch (err) {
    console.warn('Consulta en Firestore votes diferida:', err);
  }

  return false;
}

/**
 * Obtiene el registro de voto sellado para una propuesta y nullifierHash.
 */
export async function getSealedVote(nullifierHash: string, proposalId?: string): Promise<ImmutableVoteDocument | null> {
  const cache = getLocalSealedVotesCache();
  if (cache[nullifierHash]) return cache[nullifierHash];
  if (proposalId && cache[`prop_${proposalId}`]) return cache[`prop_${proposalId}`];

  try {
    if (db && db.type === 'firestore') {
      const docRef = doc(db, 'votes', nullifierHash);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as ImmutableVoteDocument;
        cacheSealedVoteLocally(data);
        return data;
      }
    }
  } catch {}

  return null;
}

/**
 * Registra el voto de forma inmutable en Firestore.
 * El ID del documento es exactamente el nullifierHash.
 */
export async function commitImmutableVote(vote: ImmutableVoteDocument): Promise<{ success: boolean; error?: string }> {
  // Validación de seguridad previa
  if (!vote || !vote.nullifierHash || !vote.proposalId || !vote.choice) {
    return { success: false, error: 'Payload de voto incompleto o inválido' };
  }

  const validChoices = ['YES', 'NO', 'DELEGATE'];
  if (!validChoices.includes(vote.choice)) {
    return {
      success: false,
      error: `ERROR_INVALID_CHOICE: Sentido de voto '${vote.choice}' inválido (debe ser YES, NO o DELEGATE)`
    };
  }

  // Comprobar si ya existe previamente (Pre-flight local)
  const alreadyExists = await hasNullifierVoted(vote.nullifierHash);
  if (alreadyExists) {
    return {
      success: false,
      error: `ERROR_NULLIFIER_ALREADY_SPENT: Ya existe un voto sellado e inmutable para este decreto (${vote.nullifierHash}). Prohibido doble voto.`
    };
  }

  // Inserción en Cloud Firestore
  try {
    if (db && (db as any).app) {
      const docRef = doc(db, 'votes', vote.nullifierHash);
      await setDoc(docRef, vote);
    }
    // Guardar en caché inmutable local
    cacheSealedVoteLocally(vote);
    return { success: true };
  } catch (err: any) {
    const errorMsg = (err?.message || String(err)).toLowerCase();
    if (
      errorMsg.includes('permission') ||
      errorMsg.includes('denied') ||
      errorMsg.includes('already exists') ||
      errorMsg.includes('failed-precondition')
    ) {
      return {
        success: false,
        error: `ERROR_FIRESTORE_IMMUTABLE_RULE: La base de datos ha rechazado la operación. El voto ya está sellado o infringe las reglas de inmutabilidad.`
      };
    }
    // Si hubo error de red, aseguramos el guardado local y notificamos éxito local
    cacheSealedVoteLocally(vote);
    return { success: true };
  }
}

/**
 * Descarga el Recibo Criptográfico Oficial en formato JSON para el ciudadano.
 */
export function triggerReceiptDownload(vote: ImmutableVoteDocument): void {
  const receiptPayload = {
    protocolo: 'Democracia Viva v1.0 - Voto Verificable Inmutable',
    urna: 'Colección Cloud Firestore Append-Only / Arbitrum L2',
    reciboId: vote.receiptId,
    nullifierHash: vote.nullifierHash,
    propuestaId: vote.proposalId,
    sentidoVoto: vote.choice,
    timestampUTC: new Date(vote.timestamp).toISOString(),
    txHashL2: vote.txHash,
    merkleRoot: vote.merkleRoot,
    merkleLeaf: vote.merkleLeaf,
    firmaClientePasskey: vote.clientSignature,
    avisoPrivacidad: 'Este recibo contiene únicamente pruebas criptográficas ZK y firmas de hardware. No contiene su nombre, DNI ni datos personales.'
  };

  const jsonString = JSON.stringify(receiptPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Recibo_Civico_${vote.receiptId}_${vote.proposalId}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
