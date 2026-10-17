/**
 * MOTOR DE ABSTRACCIÓN DE CUENTAS: ERC-4337 & PASSKEYS (WEBAUTHN)
 * Permite a cualquier ciudadano firmar votos sin criptobilleteras,
 * con autenticación biométrica y patrocinio de gas por Paymaster en L2.
 */

import { hashStringSync } from './semaphore-zk.ts';

export interface UserOperation {
  sender: string;
  nonce: number;
  callData: string;
  verificationGasLimit: number;
  callGasLimit: number;
  maxFeePerGas: number;
  maxPriorityFeePerGas: number;
  paymasterAndData: string;
}

export interface WebAuthnCredential {
  credentialId: string;
  rawAuthenticatorData: string;
  clientDataJSON: string;
  signature: string;
}

export interface SponsoredTxResult {
  txHash: string;
  blockNumber: number;
  gasPaidByCitizen: '0.0000 ETH (100% Bonificado)';
  paymasterAddress: string;
  l2Network: 'Arbitrum One L2 (ZK-Rollup)';
  latencyMs: number;
}

/**
 * Simula la firma biométrica / Passkey (FIDO2) con el Secure Enclave del dispositivo.
 */
export async function signWithPasskey(
  challenge: string,
  citizenName: string
): Promise<WebAuthnCredential> {
  // Simulación de interacción biométrica ultrarrápida (180ms)
  await new Promise((res) => setTimeout(res, 180));

  const credId = hashStringSync(`PASSKEY_ID:${citizenName}`).slice(0, 32);
  const sig = hashStringSync(`SIG:${challenge}:${credId}`);

  return {
    credentialId: credId,
    rawAuthenticatorData: '0x49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97630100000000',
    clientDataJSON: JSON.stringify({
      type: 'webauthn.get',
      challenge,
      origin: 'https://democraciaviva.es'
    }),
    signature: sig
  };
}

/**
 * El Paymaster ERC-4337 en L2 patrocina la ejecución del voto.
 * Coste para el ciudadano: 0,00 €.
 */
export function sponsorUserOp(
  userOp: UserOperation,
  nullifierHash: string
): SponsoredTxResult {
  const currentBlock = 18942300 + Math.floor(Math.random() * 50);
  const txHash = hashStringSync(`L2_TX:${userOp.sender}:${userOp.nonce}:${nullifierHash}:${Date.now()}`);

  return {
    txHash,
    blockNumber: currentBlock,
    gasPaidByCitizen: '0.0000 ETH (100% Bonificado)',
    paymasterAddress: '0x71c8435d6482d8c3686259c685bf98a28e75e921',
    l2Network: 'Arbitrum One L2 (ZK-Rollup)',
    latencyMs: 340
  };
}
