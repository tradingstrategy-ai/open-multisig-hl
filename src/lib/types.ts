export type Network = 'Mainnet' | 'Testnet'

// Signing mode determines the EIP-712 flow
// - 'user-signed': Direct EIP-712 with HyperliquidSignTransaction domain (chainId 421614)
// - 'l1': Phantom agent pattern with Exchange domain (chainId 1337) + msgpack + keccak
export type SigningMode = 'user-signed' | 'l1'

// All supported Hyperliquid multisig action types
export type ActionType =
  // User-signed actions (EIP-712 direct)
  | 'approveAgent'
  | 'usdSend'
  | 'spotSend'
  | 'withdraw'
  | 'usdClassTransfer'
  | 'approveBuilderFee'
  | 'tokenDelegate'
  | 'convertToMultiSigUser'
  | 'sendAsset'
  // L1 actions (phantom agent pattern)
  | 'vaultTransfer'
  | 'subAccountTransfer'
  | 'subAccountSpotTransfer'
  | 'createSubAccount'
  | 'order'
  | 'cancel'

// Field definition for dynamic form rendering
export interface FieldDef {
  name: string
  label: string
  eip712Type: string // EIP-712 type or msgpack type: 'address', 'string', 'uint64', 'bool', 'int', 'json'
  placeholder?: string
  required?: boolean
  mono?: boolean
  help?: string // tooltip / help text
}

// Action definition
export interface ActionDef {
  type: ActionType
  label: string
  description: string
  signingMode: SigningMode
  // For user-signed actions: the EIP-712 primary type
  primaryType?: string
  // The nonce/time field name
  nonceField: string
  fields: FieldDef[]
  // For L1 actions: whether a vault address is needed in the hash
  usesVaultAddress?: boolean
  // For L1 actions: function to build the action dict from form fields
  // (needed because msgpack field order and types must match Python SDK exactly)
  buildAction?: (fields: Record<string, string>) => Record<string, unknown>
}

// Generic form values
export interface FormValues {
  actionType: ActionType
  multisigAddress: string
  network: Network
  vaultAddress: string // optional, for vault operations
  fields: Record<string, string>
}

export interface SignatureResult {
  signer: string
  signature: {
    r: `0x${string}`
    s: `0x${string}`
    v: number
  }
  payload: {
    type: ActionType
    signingMode: SigningMode
    multisigAddress: string
    network: Network
    vaultAddress: string
    fields: Record<string, string | number | boolean>
  }
}

// Session — encoded in URL for sharing with signers
export interface Session {
  actionType: ActionType
  multisigAddress: string
  network: Network
  vaultAddress: string
  fields: Record<string, string>
  createdBy: string        // coordinator wallet address
  createdAt: number        // timestamp ms
}

export interface CoordinatorBundle {
  signatures: Array<{
    r: `0x${string}`
    s: `0x${string}`
    v: number
  }>
  inner_action: Record<string, unknown>
  multisig_user: string
  network: Network
}
