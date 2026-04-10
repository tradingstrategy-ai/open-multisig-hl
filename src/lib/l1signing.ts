import { encode } from '@msgpack/msgpack'
import { keccak256 } from 'viem'
import type { Network } from './types'

// ============================================================================
// L1 Action signing — phantom agent pattern
// Source: hyperliquid-python-sdk/hyperliquid/utils/signing.py
//
// L1 actions (orders, vault transfers, sub-account ops) use a different
// signing flow than user-signed actions:
//   1. Build the action dict
//   2. For multisig: wrap in envelope [multiSigUser, outerSigner, action]
//   3. Msgpack encode → append nonce bytes → append vault indicator
//   4. Keccak256 hash → connectionId
//   5. Sign EIP-712 with L1 domain (chainId 1337, name "Exchange")
// ============================================================================

// L1 EIP-712 domain — different from user-signed actions
export const L1_DOMAIN = {
  name: 'Exchange' as const,
  version: '1' as const,
  chainId: 1337,
  verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`,
} as const

export const L1_TYPES = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
  Agent: [
    { name: 'source', type: 'string' },
    { name: 'connectionId', type: 'bytes32' },
  ],
} as const

// Matches SDK's action_hash()
// action_hash(action, vault_address, nonce, expires_after)
export function actionHash(
  action: unknown,
  vaultAddress: string | null,
  nonce: number,
): Uint8Array {
  // 1. Msgpack encode the action
  const packed = encode(action)

  // 2. Append nonce as 8 bytes big-endian
  const nonceBytes = new Uint8Array(8)
  const view = new DataView(nonceBytes.buffer)
  // Split into high/low 32-bit parts for big-endian encoding
  view.setUint32(0, Math.floor(nonce / 0x100000000))
  view.setUint32(4, nonce >>> 0)

  // 3. Append vault address indicator
  let vaultBytes: Uint8Array
  if (vaultAddress) {
    const addrHex = vaultAddress.startsWith('0x') ? vaultAddress.slice(2) : vaultAddress
    const addrBytes = hexToBytes(addrHex)
    vaultBytes = new Uint8Array(1 + 20)
    vaultBytes[0] = 0x01
    vaultBytes.set(addrBytes, 1)
  } else {
    vaultBytes = new Uint8Array([0x00])
  }

  // 4. Concatenate all parts
  const combined = new Uint8Array(packed.length + nonceBytes.length + vaultBytes.length)
  combined.set(packed, 0)
  combined.set(nonceBytes, packed.length)
  combined.set(vaultBytes, packed.length + nonceBytes.length)

  // 5. Keccak256 hash
  const hashHex = keccak256(combined)
  return hexToBytes(hashHex.slice(2))
}

// Matches SDK's construct_phantom_agent()
export function constructPhantomAgent(
  connectionId: Uint8Array,
  isMainnet: boolean,
): { source: string; connectionId: `0x${string}` } {
  return {
    source: isMainnet ? 'a' : 'b',
    connectionId: ('0x' + bytesToHex(connectionId)) as `0x${string}`,
  }
}

// Build the full EIP-712 params for an L1 multisig action
// Matches SDK's sign_multi_sig_l1_action_payload()
export function buildL1SignTypedDataParams(params: {
  action: Record<string, unknown>
  multisigAddress: string
  outerSigner: string
  network: Network
  nonce: number
  vaultAddress: string | null
}) {
  // SDK: envelope = [payload_multi_sig_user.lower(), outer_signer.lower(), action]
  const envelope = [
    params.multisigAddress.toLowerCase(),
    params.outerSigner.toLowerCase(),
    params.action,
  ]

  // Hash the envelope
  const connectionId = actionHash(envelope, params.vaultAddress, params.nonce)
  const phantomAgent = constructPhantomAgent(connectionId, params.network === 'Mainnet')

  return {
    domain: L1_DOMAIN,
    types: L1_TYPES,
    primaryType: 'Agent' as const,
    message: phantomAgent,
  }
}

// ============================================================================
// Helpers
// ============================================================================

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
