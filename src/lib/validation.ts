import { isAddress } from 'viem'
import type { ActionDef, FormValues } from './types'

const UINT64_MAX = BigInt('18446744073709551615')

export function validateAddress(addr: string): string | null {
  if (!addr) return 'Address is required'
  if (!isAddress(addr)) return 'Invalid Ethereum address'
  return null
}

export function validateNonce(nonce: string): string | null {
  if (!nonce) return 'Required'
  const n = Number(nonce)
  if (!Number.isInteger(n) || n < 0) return 'Must be a non-negative integer'
  try {
    const big = BigInt(nonce)
    if (big > UINT64_MAX) return 'Exceeds uint64 max'
  } catch {
    return 'Invalid value'
  }
  return null
}

export function validateInt(value: string): string | null {
  if (!value) return 'Required'
  const n = Number(value)
  if (!Number.isInteger(n)) return 'Must be an integer'
  return null
}

export function validateJson(value: string): string | null {
  if (!value) return 'Required'
  try {
    const parsed = JSON.parse(value)
    if (typeof parsed !== 'object' || parsed === null) return 'Must be a JSON object'
    if (!parsed.type) return 'JSON must contain a "type" field'
  } catch {
    return 'Invalid JSON'
  }
  return null
}

export function validateField(value: string, eip712Type: string, required?: boolean): string | null {
  if (!value && required) return 'Required'
  if (!value) return null

  switch (eip712Type) {
    case 'address':
      return validateAddress(value)
    case 'uint64':
      return validateNonce(value)
    case 'int':
      return validateInt(value)
    case 'bool':
      if (value !== 'true' && value !== 'false') return 'Must be true or false'
      return null
    case 'json':
      return validateJson(value)
    default:
      return null
  }
}

export function validateForm(values: FormValues, actionDef: ActionDef): Record<string, string | null> {
  const errors: Record<string, string | null> = {
    multisigAddress: validateAddress(values.multisigAddress),
  }

  for (const field of actionDef.fields) {
    errors[field.name] = validateField(values.fields[field.name] ?? '', field.eip712Type, field.required)
  }

  return errors
}

export function isFormValid(errors: Record<string, string | null>): boolean {
  return Object.values(errors).every((e) => e === null)
}
