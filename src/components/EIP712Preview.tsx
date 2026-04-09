import { useAccount } from 'wagmi'
import { buildSignTypedDataParams, DOMAIN, getActionDef } from '../lib/eip712'
import { L1_DOMAIN } from '../lib/l1signing'
import { validateForm, isFormValid } from '../lib/validation'
import type { FormValues } from '../lib/types'

interface Props {
  values: FormValues
}

function serializeForDisplay(obj: unknown): unknown {
  if (typeof obj === 'bigint') return obj.toString()
  if (obj instanceof Uint8Array) return '0x' + Array.from(obj).map(b => b.toString(16).padStart(2, '0')).join('')
  if (Array.isArray(obj)) return obj.map(serializeForDisplay)
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      result[k] = serializeForDisplay(v)
    }
    return result
  }
  return obj
}

export function EIP712Preview({ values }: Props) {
  const { address } = useAccount()
  const actionDef = getActionDef(values.actionType)

  const errors = validateForm(values, actionDef)
  const hasValidInputs = isFormValid(errors) && address

  let preview: object

  if (hasValidInputs) {
    try {
      const params = buildSignTypedDataParams(values, address)
      preview = serializeForDisplay(params) as object

      // For L1 actions, also show the inner action dict for transparency
      if (actionDef.signingMode === 'l1' && actionDef.buildAction) {
        const innerAction = actionDef.buildAction(values.fields)
        preview = {
          _note: 'L1 action uses phantom agent pattern. The inner action is msgpack-encoded and hashed.',
          innerAction: serializeForDisplay(innerAction),
          multisigEnvelope: [
            values.multisigAddress.toLowerCase(),
            address.toLowerCase(),
            '(action above)',
          ],
          ...(serializeForDisplay(params) as Record<string, unknown>),
        }
      }
    } catch {
      preview = {
        error: 'Failed to build typed data — check form values',
        domain: actionDef.signingMode === 'l1' ? L1_DOMAIN : DOMAIN,
      }
    }
  } else {
    const domain = actionDef.signingMode === 'l1' ? L1_DOMAIN : DOMAIN
    preview = {
      domain,
      primaryType: actionDef.signingMode === 'l1' ? 'Agent' : actionDef.primaryType,
      signingMode: actionDef.signingMode,
      message: '(fill in form fields to preview)',
    }
  }

  return (
    <div>
      <div className="text-xs text-gray-400 mb-2">
        {actionDef.signingMode === 'l1'
          ? 'L1 Phantom Agent — action is msgpack + keccak hashed, then signed as Agent struct'
          : 'EIP-712 Typed Data (exact payload to sign)'}
      </div>
      <pre className="rounded-lg border border-gray-700 bg-gray-900 p-4 text-xs font-mono text-gray-300 overflow-auto max-h-[32rem]">
        {JSON.stringify(preview, null, 2)}
      </pre>
    </div>
  )
}
