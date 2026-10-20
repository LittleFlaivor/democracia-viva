/**
 * PROTOCOLO DE URNA ATÓMICA DESACOPLADA Y CENSO DE PARTICIPACIÓN (ZERO-PII)
 * Democracia Viva (democraciaviva.es)
 * 
 * Cumple estrictamente con la especificación SPEC.md:
 * 1. Estructura 1: Participation_Roll (Censo con aserción WebAuthn hardware, sin sentido de voto).
 * 2. Estructura 2: Anonymous_Ballot_Box (Urna shardeada en mapa alfabético, sin metadatos forenses, sin nullifier ni IP).
 * 3. Recibo con Sal Local (Compromiso Criptográfico voter_secret_salt).
 * 4. Invariante Contable: COUNT(Roll.VOTED_DIRECT) === COUNT(Ballot_Box).
 * 5. Aislamiento Físico: colecciones prod_* vs sandbox_*.
 */

import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, randomBytes, utf8ToBytes } from '@noble/hashes/utils.js';

export type CivicEnvironment = 'PROD' | 'SANDBOX';
export type VoteChoice = 'YES' | 'NO' | 'ABSTAIN';
export type ParticipationStatus = 'VOTED_DIRECT' | 'DELEGATED';

/**
 * ESTRUCTURA 1: Censo de Participación (Participation_Roll)
 * Registra quién participó y con qué autorización hardware, SIN revelar el sentido del voto.
 */
export interface ParticipationRollRecord {
  roll_id: string;                         // SHA-256(consultation_id + ":" + citizen_nullifier_hash)
  consultation_id: string;
  citizen_nullifier_hash: string;          // Hash pseudoanónimo irreversible (HMAC-SHA256 con Pepper)
  status: ParticipationStatus;
  webauthn_assertion_signature: string;    // Firma hardware de autorización para consultation_id
  hour_bucket: string;                     // Marca temporal agregada a nivel de hora (anti-correlación forense)
  environment: CivicEnvironment;
}

/**
 * Papeleta individual anónima dentro de un Shard
 */
export interface AnonymousBallot {
  receipt_code: string;                    // Formato "#DV-XXXX-XXXX"
  vote_choice: VoteChoice;
  commitment_hash: string;                 // SHA-256(consultation_id + ":" + vote_choice + ":" + voter_secret_salt)
}

/**
 * ESTRUCTURA 2: Urna Secreta Anti-Forense (Anonymous_Ballot_Box Shard)
 * Los votos se almacenan en un mapa indexado alfabéticamente por receipt_code.
 * CERO timestamps individuales, CERO nullifier, CERO IP, CERO referencia al censo.
 */
export interface BallotBoxShard {
  shard_id: string;
  consultation_id: string;
  ballots_map: Record<string, AnonymousBallot>; // Ordenado alfabéticamente por receipt_code
  environment: CivicEnvironment;
}

/**
 * Recibo confidencial guardado en el cliente (localStorage del teléfono)
 */
export interface ClientVoterReceipt {
  receipt_code: string;
  consultation_id: string;
  vote_choice: VoteChoice;
  voter_secret_salt: string;               // 128 bits aleatorios generados en el dispositivo
  commitment_hash: string;
  timestamp: number;
}

/**
 * Resultado de auditoría del Invariante Contable
 */
export interface AccountingAuditResult {
  consultation_id: string;
  environment: CivicEnvironment;
  direct_voters_in_roll: number;
  ballots_in_urn: number;
  balanced: boolean;
  difference: number;
  status: 'AUDIT_OK_BALANCED' | 'AUDIT_ALERT_UNBALANCED' | 'BALLOT_STUFFING_DETECTED';
  alert_message?: string;
  checked_at: number;
}

/**
 * Utilidades criptográficas estándar para el compromiso con sal local
 */
export function generateVoterSecretSalt(): string {
  return bytesToHex(randomBytes(16)); // 128 bits de entropía
}

export function computeCommitmentHash(consultationId: string, choice: VoteChoice, salt: string): string {
  const payload = `${consultationId}:${choice}:${salt}`;
  return bytesToHex(sha256(utf8ToBytes(payload)));
}

export function generateReceiptCode(commitmentHash: string): string {
  const clean = commitmentHash.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  const p1 = clean.slice(0, 4);
  const p2 = clean.slice(4, 8);
  return `#DV-${p1}-${p2}`;
}

export function roundToHourBucket(timestampMs: number = Date.now()): string {
  const date = new Date(timestampMs);
  date.setMinutes(0, 0, 0);
  return date.toISOString();
}

/**
 * Validador público del recibo local frente a la urna pública
 */
export function verifyClientReceipt(
  receipt: ClientVoterReceipt,
  ballotFromUrn?: AnonymousBallot
): { verified: boolean; tampered: boolean; reason?: string } {
  // 1. Recalcular compromiso local
  const expectedHash = computeCommitmentHash(receipt.consultation_id, receipt.vote_choice, receipt.voter_secret_salt);
  if (expectedHash !== receipt.commitment_hash) {
    return { verified: false, tampered: true, reason: 'El hash de compromiso local fue alterado en el cliente' };
  }

  // 2. Si no se suministró la papeleta de la urna
  if (!ballotFromUrn) {
    return { verified: false, tampered: false, reason: 'Recibo no encontrado en la urna pública' };
  }

  // 3. Comprobar que en la urna coincide exactamente el hash de compromiso
  if (ballotFromUrn.commitment_hash !== receipt.commitment_hash) {
    return {
      verified: false,
      tampered: true,
      reason: '¡ALERTA DE MANIPULACIÓN! El hash de compromiso en la urna no coincide con el emitido por el teléfono'
    };
  }

  // 4. Comprobar que el sentido del voto no fue manipulado
  if (ballotFromUrn.vote_choice !== receipt.vote_choice) {
    return {
      verified: false,
      tampered: true,
      reason: '¡ALERTA DE MANIPULACIÓN! El sentido del voto en la base de datos fue alterado respecto a la papeleta original'
    };
  }

  return { verified: true, tampered: false };
}

/**
 * Gestor de la Urna Atómica y Censo Desacoplado
 * Soporta aislamiento físico estricto (PROD vs. SANDBOX).
 */
export class AtomicBallotBoxManager {
  readonly env: CivicEnvironment;
  readonly rollCollectionName: string;
  readonly boxCollectionName: string;

  // Almacenamiento en memoria para el modelo transaccional
  private roll = new Map<string, ParticipationRollRecord>(); // key: roll_id
  private shards = new Map<string, BallotBoxShard>();         // key: shard_id

  constructor(env: CivicEnvironment = 'SANDBOX') {
    this.env = env;
    this.rollCollectionName = env === 'PROD' ? 'prod_participation_roll' : 'sandbox_participation_roll';
    this.boxCollectionName = env === 'PROD' ? 'prod_ballot_box' : 'sandbox_ballot_box';
  }

  /**
   * Pre-crea los Shards de la urna para una consulta (para eliminar metadatos temporales de inserción)
   */
  initializeConsultationShards(consultationId: string, shardCount: number = 4): void {
    for (let i = 0; i < shardCount; i++) {
      const shardId = `${this.boxCollectionName}_${consultationId}_shard_${String(i).padStart(2, '0')}`;
      if (!this.shards.has(shardId)) {
        this.shards.set(shardId, {
          shard_id: shardId,
          consultation_id: consultationId,
          ballots_map: {},
          environment: this.env
        });
      }
    }
  }

  /**
   * Selecciona un shard determinista pero distribuido mediante hash del receipt_code
   */
  private getShardForReceipt(consultationId: string, receiptCode: string): BallotBoxShard {
    const shardKeys = Array.from(this.shards.keys()).filter(k => k.includes(consultationId));
    if (shardKeys.length === 0) {
      this.initializeConsultationShards(consultationId, 4);
      return this.getShardForReceipt(consultationId, receiptCode);
    }
    const hash = bytesToHex(sha256(utf8ToBytes(receiptCode)));
    const index = parseInt(hash.slice(0, 4), 16) % shardKeys.length;
    return this.shards.get(shardKeys[index])!;
  }

  /**
   * Emisión de voto en Transacción Atómica Desacoplada:
   * 1. Inserta en Participation_Roll (falla si el nullifier ya votó en la consulta).
   * 2. Inserta la papeleta anónima en Anonymous_Ballot_Box (shard sin metadatos forenses).
   */
  async castAtomicVote(params: {
    consultationId: string;
    citizenNullifierHash: string;
    voteChoice: VoteChoice;
    webauthnAssertionSignature: string;
    voterSecretSalt?: string;
  }): Promise<{
    ok: boolean;
    receipt?: ClientVoterReceipt;
    code?: string;
    error?: string;
  }> {
    const { consultationId, citizenNullifierHash, voteChoice, webauthnAssertionSignature } = params;

    // 1. Validar presencia de firma de hardware WebAuthn (Anti-Ballot Stuffing)
    if (!webauthnAssertionSignature || webauthnAssertionSignature.length < 16) {
      return {
        ok: false,
        code: 'MISSING_WEBAUTHN_SIGNATURE',
        error: 'Se requiere una aserción criptográfica WebAuthn válida generada por el sensor del dispositivo'
      };
    }

    // 2. Comprobar restricción de unicidad en el Censo (Anti-Doble Voto)
    const rollId = bytesToHex(sha256(utf8ToBytes(`${consultationId}:${citizenNullifierHash}`)));
    if (this.roll.has(rollId)) {
      return {
        ok: false,
        code: 'DOUBLE_VOTE_REJECTED',
        error: 'El ciudadano ya ha participado en esta consulta. Voto duplicado bloqueado por el Censo.'
      };
    }

    // 3. Generar sal local y compromiso criptográfico
    const salt = params.voterSecretSalt || generateVoterSecretSalt();
    const commitmentHash = computeCommitmentHash(consultationId, voteChoice, salt);
    const receiptCode = generateReceiptCode(commitmentHash);

    // 4. Ejecutar Transacción Atómica
    // Paso A: Guardar en el Censo de Participación (sin la opción votada)
    const rollRecord: ParticipationRollRecord = {
      roll_id: rollId,
      consultation_id: consultationId,
      citizen_nullifier_hash: citizenNullifierHash,
      status: 'VOTED_DIRECT',
      webauthn_assertion_signature: webauthnAssertionSignature,
      hour_bucket: roundToHourBucket(),
      environment: this.env
    };
    this.roll.set(rollId, rollRecord);

    // Paso B: Guardar papeleta anónima en la urna (sin nullifier, sin IP, sin marca individual)
    const shard = this.getShardForReceipt(consultationId, receiptCode);
    shard.ballots_map[receiptCode] = {
      receipt_code: receiptCode,
      vote_choice: voteChoice,
      commitment_hash: commitmentHash
    };

    // Reordenar alfabéticamente las claves del shard para garantizar orden canónico en disco
    const sortedKeys = Object.keys(shard.ballots_map).sort();
    const sortedMap: Record<string, AnonymousBallot> = {};
    for (const k of sortedKeys) {
      sortedMap[k] = shard.ballots_map[k];
    }
    shard.ballots_map = sortedMap;

    // 5. Retornar el recibo para el cliente
    const receipt: ClientVoterReceipt = {
      receipt_code: receiptCode,
      consultation_id: consultationId,
      vote_choice: voteChoice,
      voter_secret_salt: salt,
      commitment_hash: commitmentHash,
      timestamp: Date.now()
    };

    return { ok: true, receipt };
  }

  /**
   * Registro de delegación líquida en el Censo
   */
  async recordDelegation(params: {
    consultationId: string;
    citizenNullifierHash: string;
    webauthnAssertionSignature: string;
  }): Promise<{ ok: boolean; code?: string; error?: string }> {
    const { consultationId, citizenNullifierHash, webauthnAssertionSignature } = params;
    const rollId = bytesToHex(sha256(utf8ToBytes(`${consultationId}:${citizenNullifierHash}`)));

    // Si ya votó directo, prevalece el voto directo
    const existing = this.roll.get(rollId);
    if (existing && existing.status === 'VOTED_DIRECT') {
      return {
        ok: false,
        code: 'ALREADY_VOTED_DIRECT',
        error: 'El ciudadano ya emitió un voto directo, el cual prevalece sobre cualquier delegación.'
      };
    }

    this.roll.set(rollId, {
      roll_id: rollId,
      consultation_id: consultationId,
      citizen_nullifier_hash: citizenNullifierHash,
      status: 'DELEGATED',
      webauthn_assertion_signature: webauthnAssertionSignature,
      hour_bucket: roundToHourBucket(),
      environment: this.env
    });

    return { ok: true };
  }

  /**
   * Búsqueda pública de una papeleta por receipt_code (para que cualquier ciudadano audite su voto)
   */
  getBallotByReceipt(consultationId: string, receiptCode: string): AnonymousBallot | null {
    for (const shard of this.shards.values()) {
      if (shard.consultation_id === consultationId && shard.ballots_map[receiptCode]) {
        return shard.ballots_map[receiptCode];
      }
    }
    return null;
  }

  /**
   * Lista ordenada de todos los recibos y papeletas de una consulta
   */
  getAllBallots(consultationId: string): AnonymousBallot[] {
    const list: AnonymousBallot[] = [];
    for (const shard of this.shards.values()) {
      if (shard.consultation_id === consultationId) {
        list.push(...Object.values(shard.ballots_map));
      }
    }
    return list.sort((a, b) => a.receipt_code.localeCompare(b.receipt_code));
  }

  /**
   * Escrutinio público de la urna anónima
   */
  getTally(consultationId: string): { YES: number; NO: number; ABSTAIN: number; total: number } {
    const tally = { YES: 0, NO: 0, ABSTAIN: 0, total: 0 };
    for (const ballot of this.getAllBallots(consultationId)) {
      if (tally[ballot.vote_choice] !== undefined) {
        tally[ballot.vote_choice]++;
        tally.total++;
      }
    }
    return tally;
  }

  /**
   * Auditoría del Invariante Público de Cuadre:
   * COUNT(Participation_Roll WHERE status == 'VOTED_DIRECT') === COUNT(Anonymous_Ballot_Box)
   */
  auditAccountingBalance(consultationId: string): AccountingAuditResult {
    let directVoters = 0;
    let missingSignatures = 0;

    for (const r of this.roll.values()) {
      if (r.consultation_id === consultationId && r.status === 'VOTED_DIRECT') {
        directVoters++;
        if (!r.webauthn_assertion_signature || r.webauthn_assertion_signature.length < 16) {
          missingSignatures++;
        }
      }
    }

    const ballotsInUrn = this.getAllBallots(consultationId).length;
    const diff = directVoters - ballotsInUrn;
    const balanced = diff === 0;

    let status: AccountingAuditResult['status'] = 'AUDIT_OK_BALANCED';
    let alert_message: string | undefined;

    if (missingSignatures > 0) {
      status = 'BALLOT_STUFFING_DETECTED';
      alert_message = `ALERTA CRÍTICA: Se detectaron ${missingSignatures} registros en el Censo sin firma hardware WebAuthn válida`;
    } else if (!balanced) {
      status = 'AUDIT_ALERT_UNBALANCED';
      alert_message = diff > 0
        ? `DESAJUSTE: Existen ${diff} firmas en el Censo sin papeleta en la Urna`
        : `DESAJUSTE: Existen ${Math.abs(diff)} papeletas en la Urna sin firma hardware en el Censo`;
    }

    return {
      consultation_id: consultationId,
      environment: this.env,
      direct_voters_in_roll: directVoters,
      ballots_in_urn: ballotsInUrn,
      balanced,
      difference: diff,
      status,
      alert_message,
      checked_at: Date.now()
    };
  }

  /**
   * SIMULADOR PEDAGÓGICO DE ATAQUE ADVERSARIO (EDUCATIONAL SANDBOX TAMPERING)
   * Permite poner a prueba las alarmas en el modo Sandbox:
   * a) Modificar el sentido de un voto existente para verificar que commitment_hash falla.
   * b) Inyectar un voto fantasma en la urna sin firma en el Censo para verificar que el cuadre contable falla.
   */
  simulateTampering(params: {
    consultationId: string;
    type: 'ALTER_VOTE_CHOICE' | 'INJECT_GHOST_BALLOT' | 'INJECT_UNSIGNED_ROLL';
    targetReceiptCode?: string;
  }): { ok: boolean; message: string; audit: AccountingAuditResult } {
    if (this.env === 'PROD') {
      throw new Error('La simulación de ataque está terminantemente prohibida en entorno PROD');
    }

    const { consultationId, type, targetReceiptCode } = params;

    if (type === 'ALTER_VOTE_CHOICE') {
      // Modificar el voto de una papeleta en la urna para que no cuadre con el commitment_hash
      const ballots = this.getAllBallots(consultationId);
      const target = targetReceiptCode ? this.getBallotByReceipt(consultationId, targetReceiptCode) : ballots[0];
      if (!target) {
        return { ok: false, message: 'No hay votos en la urna para alterar', audit: this.auditAccountingBalance(consultationId) };
      }
      const previousChoice = target.vote_choice;
      target.vote_choice = previousChoice === 'YES' ? 'NO' : 'YES';
      return {
        ok: true,
        message: `Papeleta ${target.receipt_code} alterada de ${previousChoice} a ${target.vote_choice}. La sal local del ciudadano detectará el fraude.`,
        audit: this.auditAccountingBalance(consultationId)
      };
    }

    if (type === 'INJECT_GHOST_BALLOT') {
      // Inyectar papeleta en la urna sin aserción WebAuthn en el censo
      const fakeSalt = generateVoterSecretSalt();
      const fakeHash = computeCommitmentHash(consultationId, 'YES', fakeSalt);
      const fakeCode = `#DV-FAKE-${bytesToHex(randomBytes(2)).toUpperCase()}`;
      const shard = this.getShardForReceipt(consultationId, fakeCode);
      shard.ballots_map[fakeCode] = {
        receipt_code: fakeCode,
        vote_choice: 'YES',
        commitment_hash: fakeHash
      };
      return {
        ok: true,
        message: `Voto fantasma inyectado en la urna (${fakeCode}) sin registro en el Censo. El invariante contable se romperá inmediatamente.`,
        audit: this.auditAccountingBalance(consultationId)
      };
    }

    if (type === 'INJECT_UNSIGNED_ROLL') {
      // Inyectar en el Censo sin firma WebAuthn
      const fakeNullifier = `0x${bytesToHex(randomBytes(16))}`;
      const rollId = bytesToHex(sha256(utf8ToBytes(`${consultationId}:${fakeNullifier}`)));
      this.roll.set(rollId, {
        roll_id: rollId,
        consultation_id: consultationId,
        citizen_nullifier_hash: fakeNullifier,
        status: 'VOTED_DIRECT',
        webauthn_assertion_signature: '', // FIRMA VACÍA MALICIOSA
        hour_bucket: roundToHourBucket(),
        environment: this.env
      });
      return {
        ok: true,
        message: 'Registro inyectado en el Censo sin firma hardware WebAuthn. El detector de Ballot Stuffing lo interceptará.',
        audit: this.auditAccountingBalance(consultationId)
      };
    }

    return { ok: false, message: 'Tipo de manipulación no reconocido', audit: this.auditAccountingBalance(consultationId) };
  }

  /**
   * Vaciado completo del entorno Sandbox (Reset a Cero)
   */
  resetSandbox(): void {
    if (this.env === 'PROD') {
      throw new Error('No se puede vaciar el entorno de PRODUCCIÓN');
    }
    this.roll.clear();
    for (const shard of this.shards.values()) {
      shard.ballots_map = {};
    }
  }
}
