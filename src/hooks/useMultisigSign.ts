import { useState } from 'react'
import { useAccount, useSignTypedData } from 'wagmi'
import { parseSignature, recoverTypedDataAddress } from 'viem'
import { buildSignTypedDataParams, getActionDef } from '../lib/eip712'
import type { FormValues, SignatureResult } from '../lib/types'

export function useMultisigSign() {
  const { address } = useAccount()
  const { signTypedDataAsync } = useSignTypedData()
  const [result, setResult] = useState<SignatureResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)

  const sign = async (values: FormValues) => {
    if (!address) {
      setError('Wallet not connected')
      return
    }

    setError(null)
    setSigning(true)

    try {
      const params = buildSignTypedDataParams(values, address)

      const rawSignature = await signTypedDataAsync({
        domain: params.domain,
        types: params.types as Record<string, Array<{ name: string; type: string }>>,
        primaryType: params.primaryType,
        message: params.message as Record<string, unknown>,
      })

      const { r, s, v } = parseSignature(rawSignature)

      // Sanity check: verify the signature recovers to the connected address
      const recovered = await recoverTypedDataAddress({
        domain: params.domain,
        types: params.types as Record<string, Array<{ name: string; type: string }>>,
        primaryType: params.primaryType,
        message: params.message as Record<string, unknown>,
        signature: rawSignature,
      })

      if (recovered.toLowerCase() !== address.toLowerCase()) {
        setError(
          `Signature recovery mismatch: expected ${address}, got ${recovered}. This signature may be invalid.`
        )
        return
      }

      const actionDef = getActionDef(values.actionType)

      // Build payload with proper type coercion for output
      const fieldValues: Record<string, string | number | boolean> = {}
      for (const [k, val] of Object.entries(values.fields)) {
        fieldValues[k] = val
      }

      const sigResult: SignatureResult = {
        signer: address,
        signature: {
          r,
          s,
          v: Number(v),
        },
        payload: {
          type: values.actionType,
          signingMode: actionDef.signingMode,
          multisigAddress: values.multisigAddress,
          network: values.network,
          vaultAddress: values.vaultAddress || '',
          fields: fieldValues,
        },
      }

      setResult(sigResult)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signing failed'
      setError(message)
    } finally {
      setSigning(false)
    }
  }

  return { sign, result, error, signing, reset: () => { setResult(null); setError(null) } }
}
