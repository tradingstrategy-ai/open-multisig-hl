import type { ActionDef, ActionType, FormValues, Network } from './types'
import { buildL1SignTypedDataParams } from './l1signing'

// ============================================================================
// EIP-712 constants — exact match of Hyperliquid Python SDK
// Source: hyperliquid-python-sdk/hyperliquid/utils/signing.py
// ============================================================================

// Domain for user-signed actions
export const DOMAIN = {
  name: 'HyperliquidSignTransaction' as const,
  version: '1' as const,
  chainId: 421614, // 0x66eee
  verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`,
} as const

// ============================================================================
// Action registry
// ============================================================================

export const ACTION_REGISTRY: Record<ActionType, ActionDef> = {
  // ==== USER-SIGNED ACTIONS (EIP-712 direct) ====

  approveAgent: {
    type: 'approveAgent',
    label: 'Approve Agent',
    description: 'Approve an API wallet / agent to trade on behalf of the multisig',
    signingMode: 'user-signed',
    primaryType: 'HyperliquidTransaction:ApproveAgent',
    nonceField: 'nonce',
    fields: [
      { name: 'agentAddress', label: 'Agent Address', eip712Type: 'address', placeholder: '0x...', required: true, mono: true },
      { name: 'agentName', label: 'Agent Name (optional)', eip712Type: 'string', placeholder: 'e.g. trading-bot-1' },
      { name: 'nonce', label: 'Nonce', eip712Type: 'uint64', placeholder: 'Timestamp in ms', required: true, mono: true },
    ],
  },
  usdSend: {
    type: 'usdSend',
    label: 'USD Send',
    description: 'Transfer USDC to another address on Hyperliquid',
    signingMode: 'user-signed',
    primaryType: 'HyperliquidTransaction:UsdSend',
    nonceField: 'time',
    fields: [
      { name: 'destination', label: 'Destination Address', eip712Type: 'string', placeholder: '0x...', required: true, mono: true },
      { name: 'amount', label: 'Amount (USDC)', eip712Type: 'string', placeholder: '100.0', required: true },
      { name: 'time', label: 'Time (nonce)', eip712Type: 'uint64', placeholder: 'Timestamp in ms', required: true, mono: true },
    ],
  },
  spotSend: {
    type: 'spotSend',
    label: 'Spot Send',
    description: 'Transfer spot tokens to another address',
    signingMode: 'user-signed',
    primaryType: 'HyperliquidTransaction:SpotSend',
    nonceField: 'time',
    fields: [
      { name: 'destination', label: 'Destination Address', eip712Type: 'string', placeholder: '0x...', required: true, mono: true },
      { name: 'token', label: 'Token', eip712Type: 'string', placeholder: 'e.g. HYPE', required: true },
      { name: 'amount', label: 'Amount', eip712Type: 'string', placeholder: '10.0', required: true },
      { name: 'time', label: 'Time (nonce)', eip712Type: 'uint64', placeholder: 'Timestamp in ms', required: true, mono: true },
    ],
  },
  withdraw: {
    type: 'withdraw',
    label: 'Withdraw',
    description: 'Withdraw USDC from Hyperliquid to Arbitrum',
    signingMode: 'user-signed',
    primaryType: 'HyperliquidTransaction:Withdraw',
    nonceField: 'time',
    fields: [
      { name: 'destination', label: 'Destination Address', eip712Type: 'string', placeholder: '0x...', required: true, mono: true },
      { name: 'amount', label: 'Amount (USDC)', eip712Type: 'string', placeholder: '100.0', required: true },
      { name: 'time', label: 'Time (nonce)', eip712Type: 'uint64', placeholder: 'Timestamp in ms', required: true, mono: true },
    ],
  },
  usdClassTransfer: {
    type: 'usdClassTransfer',
    label: 'USD Class Transfer',
    description: 'Move USDC between spot and perp accounts',
    signingMode: 'user-signed',
    primaryType: 'HyperliquidTransaction:UsdClassTransfer',
    nonceField: 'nonce',
    fields: [
      { name: 'amount', label: 'Amount (USDC)', eip712Type: 'string', placeholder: '100.0', required: true },
      { name: 'toPerp', label: 'To Perp?', eip712Type: 'bool', required: true },
      { name: 'nonce', label: 'Nonce', eip712Type: 'uint64', placeholder: 'Timestamp in ms', required: true, mono: true },
    ],
  },
  approveBuilderFee: {
    type: 'approveBuilderFee',
    label: 'Approve Builder Fee',
    description: 'Approve a builder fee rate for a specific builder address',
    signingMode: 'user-signed',
    primaryType: 'HyperliquidTransaction:ApproveBuilderFee',
    nonceField: 'nonce',
    fields: [
      { name: 'maxFeeRate', label: 'Max Fee Rate', eip712Type: 'string', placeholder: '0.01%', required: true },
      { name: 'builder', label: 'Builder Address', eip712Type: 'address', placeholder: '0x...', required: true, mono: true },
      { name: 'nonce', label: 'Nonce', eip712Type: 'uint64', placeholder: 'Timestamp in ms', required: true, mono: true },
    ],
  },
  tokenDelegate: {
    type: 'tokenDelegate',
    label: 'Token Delegate (Stake)',
    description: 'Delegate (stake) or undelegate HYPE tokens to a validator',
    signingMode: 'user-signed',
    primaryType: 'HyperliquidTransaction:TokenDelegate',
    nonceField: 'nonce',
    fields: [
      { name: 'validator', label: 'Validator Address', eip712Type: 'address', placeholder: '0x...', required: true, mono: true },
      { name: 'wei', label: 'Amount (wei)', eip712Type: 'uint64', placeholder: 'Amount in wei', required: true, mono: true },
      { name: 'isUndelegate', label: 'Undelegate?', eip712Type: 'bool', required: true },
      { name: 'nonce', label: 'Nonce', eip712Type: 'uint64', placeholder: 'Timestamp in ms', required: true, mono: true },
    ],
  },
  convertToMultiSigUser: {
    type: 'convertToMultiSigUser',
    label: 'Convert to MultiSig',
    description: 'Convert a regular account to a multisig account',
    signingMode: 'user-signed',
    primaryType: 'HyperliquidTransaction:ConvertToMultiSigUser',
    nonceField: 'nonce',
    fields: [
      { name: 'signers', label: 'Signers (JSON)', eip712Type: 'string', placeholder: '{"threshold":2,"signers":["0x...","0x..."]}', required: true },
      { name: 'nonce', label: 'Nonce', eip712Type: 'uint64', placeholder: 'Timestamp in ms', required: true, mono: true },
    ],
  },
  sendAsset: {
    type: 'sendAsset',
    label: 'Send Asset',
    description: 'Send an asset between sub-accounts or DEXes',
    signingMode: 'user-signed',
    primaryType: 'HyperliquidTransaction:SendAsset',
    nonceField: 'nonce',
    fields: [
      { name: 'destination', label: 'Destination Address', eip712Type: 'string', placeholder: '0x...', required: true, mono: true },
      { name: 'sourceDex', label: 'Source DEX', eip712Type: 'string', placeholder: 'e.g. HyperCore', required: true },
      { name: 'destinationDex', label: 'Destination DEX', eip712Type: 'string', placeholder: 'e.g. HyperCore', required: true },
      { name: 'token', label: 'Token', eip712Type: 'string', placeholder: 'e.g. USDC', required: true },
      { name: 'amount', label: 'Amount', eip712Type: 'string', placeholder: '100.0', required: true },
      { name: 'fromSubAccount', label: 'From Sub-Account', eip712Type: 'string', placeholder: 'Leave empty if none' },
      { name: 'nonce', label: 'Nonce', eip712Type: 'uint64', placeholder: 'Timestamp in ms', required: true, mono: true },
    ],
  },

  // ==== L1 ACTIONS (phantom agent pattern) ====

  vaultTransfer: {
    type: 'vaultTransfer',
    label: 'Vault Transfer',
    description: 'Deposit into or withdraw from a vault',
    signingMode: 'l1',
    nonceField: '_nonce',
    usesVaultAddress: true,
    fields: [
      { name: 'vaultAddress', label: 'Vault Address', eip712Type: 'string', placeholder: '0x...', required: true, mono: true },
      { name: 'isDeposit', label: 'Deposit?', eip712Type: 'bool', required: true, help: 'Yes = deposit into vault, No = withdraw from vault' },
      { name: 'usd', label: 'Amount (raw integer)', eip712Type: 'int', placeholder: 'e.g. 100000000 for 100 USDC', required: true, mono: true, help: 'Raw integer amount. Typically amount * 1e6 for USDC.' },
      { name: '_nonce', label: 'Nonce', eip712Type: 'uint64', placeholder: 'Timestamp in ms', required: true, mono: true },
    ],
    buildAction: (fields) => ({
      type: 'vaultTransfer',
      vaultAddress: fields.vaultAddress,
      isDeposit: fields.isDeposit === 'true',
      usd: parseInt(fields.usd),
    }),
  },
  subAccountTransfer: {
    type: 'subAccountTransfer',
    label: 'Sub-Account Transfer',
    description: 'Transfer USD to or from a sub-account',
    signingMode: 'l1',
    nonceField: '_nonce',
    fields: [
      { name: 'subAccountUser', label: 'Sub-Account Address', eip712Type: 'string', placeholder: '0x...', required: true, mono: true },
      { name: 'isDeposit', label: 'Deposit to sub-account?', eip712Type: 'bool', required: true },
      { name: 'usd', label: 'Amount (raw integer)', eip712Type: 'int', placeholder: 'e.g. 100000000 for 100 USDC', required: true, mono: true, help: 'Raw integer amount. Typically amount * 1e6 for USDC.' },
      { name: '_nonce', label: 'Nonce', eip712Type: 'uint64', placeholder: 'Timestamp in ms', required: true, mono: true },
    ],
    buildAction: (fields) => ({
      type: 'subAccountTransfer',
      subAccountUser: fields.subAccountUser,
      isDeposit: fields.isDeposit === 'true',
      usd: parseInt(fields.usd),
    }),
  },
  subAccountSpotTransfer: {
    type: 'subAccountSpotTransfer',
    label: 'Sub-Account Spot Transfer',
    description: 'Transfer spot tokens to or from a sub-account',
    signingMode: 'l1',
    nonceField: '_nonce',
    fields: [
      { name: 'subAccountUser', label: 'Sub-Account Address', eip712Type: 'string', placeholder: '0x...', required: true, mono: true },
      { name: 'isDeposit', label: 'Deposit to sub-account?', eip712Type: 'bool', required: true },
      { name: 'token', label: 'Token', eip712Type: 'string', placeholder: 'e.g. HYPE', required: true },
      { name: 'amount', label: 'Amount', eip712Type: 'string', placeholder: '10.0', required: true },
      { name: '_nonce', label: 'Nonce', eip712Type: 'uint64', placeholder: 'Timestamp in ms', required: true, mono: true },
    ],
    buildAction: (fields) => ({
      type: 'subAccountSpotTransfer',
      subAccountUser: fields.subAccountUser,
      isDeposit: fields.isDeposit === 'true',
      token: fields.token,
      amount: fields.amount,
    }),
  },
  createSubAccount: {
    type: 'createSubAccount',
    label: 'Create Sub-Account',
    description: 'Create a new named sub-account',
    signingMode: 'l1',
    nonceField: '_nonce',
    fields: [
      { name: 'name', label: 'Sub-Account Name', eip712Type: 'string', placeholder: 'e.g. trading-1', required: true },
      { name: '_nonce', label: 'Nonce', eip712Type: 'uint64', placeholder: 'Timestamp in ms', required: true, mono: true },
    ],
    buildAction: (fields) => ({
      type: 'createSubAccount',
      name: fields.name,
    }),
  },
  order: {
    type: 'order',
    label: 'Place Order',
    description: 'Place a limit or market order (paste raw action JSON)',
    signingMode: 'l1',
    nonceField: '_nonce',
    fields: [
      { name: '_actionJson', label: 'Action JSON', eip712Type: 'json', placeholder: '{"type":"order","orders":[...],"grouping":"na"}', required: true, help: 'Paste the exact action dict as JSON. Must match the SDK format exactly.' },
      { name: '_nonce', label: 'Nonce', eip712Type: 'uint64', placeholder: 'Timestamp in ms', required: true, mono: true },
    ],
    buildAction: (fields) => JSON.parse(fields._actionJson),
  },
  cancel: {
    type: 'cancel',
    label: 'Cancel Order',
    description: 'Cancel an order by asset index and order ID',
    signingMode: 'l1',
    nonceField: '_nonce',
    fields: [
      { name: 'asset', label: 'Asset Index', eip712Type: 'int', placeholder: 'e.g. 0 for BTC', required: true, mono: true, help: 'Numeric asset index on Hyperliquid' },
      { name: 'oid', label: 'Order ID', eip712Type: 'int', placeholder: 'Order ID to cancel', required: true, mono: true },
      { name: '_nonce', label: 'Nonce', eip712Type: 'uint64', placeholder: 'Timestamp in ms', required: true, mono: true },
    ],
    buildAction: (fields) => ({
      type: 'cancel',
      cancels: [{ a: parseInt(fields.asset), o: parseInt(fields.oid) }],
    }),
  },
}

// ============================================================================
// EIP-712 type builders (user-signed actions only)
// ============================================================================

function buildMultisigTypes(actionDef: ActionDef) {
  const baseTypes: Array<{ name: string; type: string }> = [
    { name: 'hyperliquidChain', type: 'string' },
    { name: 'payloadMultiSigUser', type: 'address' },
    { name: 'outerSigner', type: 'address' },
  ]
  for (const field of actionDef.fields) {
    baseTypes.push({ name: field.name, type: field.eip712Type })
  }
  return {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    [actionDef.primaryType!]: baseTypes,
  }
}

function buildMultisigMessage(
  actionDef: ActionDef,
  params: { network: Network; multisigAddress: string; outerSigner: string; fields: Record<string, string> },
) {
  const message: Record<string, unknown> = {
    hyperliquidChain: params.network,
    payloadMultiSigUser: params.multisigAddress.toLowerCase(),
    outerSigner: params.outerSigner.toLowerCase(),
  }
  for (const field of actionDef.fields) {
    const rawValue = params.fields[field.name] ?? ''
    switch (field.eip712Type) {
      case 'uint64':
        message[field.name] = BigInt(rawValue || '0')
        break
      case 'bool':
        message[field.name] = rawValue === 'true'
        break
      case 'address':
        message[field.name] = rawValue as `0x${string}`
        break
      default:
        message[field.name] = rawValue
    }
  }
  return message
}

// ============================================================================
// Public API
// ============================================================================

export function getActionDef(actionType: ActionType): ActionDef {
  return ACTION_REGISTRY[actionType]
}

export function getAllActions(): ActionDef[] {
  return Object.values(ACTION_REGISTRY)
}

export function buildSignTypedDataParams(values: FormValues, outerSigner: string) {
  const actionDef = ACTION_REGISTRY[values.actionType]

  if (actionDef.signingMode === 'l1') {
    // L1 actions use phantom agent pattern
    const action = actionDef.buildAction!(values.fields)
    const nonceValue = parseInt(values.fields[actionDef.nonceField] || '0')
    const vaultAddr = actionDef.usesVaultAddress && values.fields.vaultAddress
      ? values.fields.vaultAddress
      : (values.vaultAddress || null)

    return buildL1SignTypedDataParams({
      action,
      multisigAddress: values.multisigAddress,
      outerSigner,
      network: values.network,
      nonce: nonceValue,
      vaultAddress: vaultAddr,
    })
  }

  // User-signed actions use direct EIP-712
  return {
    domain: DOMAIN,
    types: buildMultisigTypes(actionDef),
    primaryType: actionDef.primaryType!,
    message: buildMultisigMessage(actionDef, {
      network: values.network,
      multisigAddress: values.multisigAddress,
      outerSigner,
      fields: values.fields,
    }),
  }
}
