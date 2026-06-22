import { getActionDef } from './eip712'
import { buildL1SigningContext } from './l1signing'
import type { FormValues } from './types'

export interface L1FormSigningContext {
  action: Record<string, unknown>
  nonce: number
  vaultAddress: string | null
  envelope: unknown[]
  connectionId: `0x${string}`
  typedData: ReturnType<typeof buildL1SigningContext>['typedData']
}

export function buildL1FormSigningContext(
  values: FormValues,
  outerSigner: string,
): L1FormSigningContext {
  const actionDef = getActionDef(values.actionType)
  if (actionDef.signingMode !== 'l1') {
    throw new Error(`${actionDef.label} is not an L1 action.`)
  }
  if (!actionDef.buildAction) {
    throw new Error(`${actionDef.label} is missing an L1 action builder.`)
  }

  const nonceRaw = values.fields[actionDef.nonceField]
  const nonce = parseInt(nonceRaw ?? '', 10)
  if (!Number.isFinite(nonce)) {
    throw new Error(`Invalid nonce for ${actionDef.label}: ${nonceRaw}`)
  }

  const action = actionDef.buildAction(values.fields)
  const vaultAddress = values.vaultAddress || null
  const context = buildL1SigningContext({
    action,
    multisigAddress: values.multisigAddress,
    outerSigner,
    network: values.network,
    nonce,
    vaultAddress,
  })

  return {
    action,
    nonce,
    vaultAddress,
    envelope: context.envelope,
    connectionId: context.connectionId,
    typedData: context.typedData,
  }
}

export function formValuesFromSignaturePayload(payload: {
  type: FormValues['actionType']
  multisigAddress: string
  network: FormValues['network']
  vaultAddress: string
  fields: Record<string, string | number | boolean>
}): FormValues {
  return {
    actionType: payload.type,
    multisigAddress: payload.multisigAddress,
    network: payload.network,
    vaultAddress: payload.vaultAddress || '',
    fields: Object.fromEntries(
      Object.entries(payload.fields).map(([key, value]) => [key, String(value)]),
    ),
  }
}
