import { useState } from 'react'
import type { SignatureResult, CoordinatorBundle } from '../lib/types'

function download(data: string, filename: string) {
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function CoordinatorHelper() {
  const [expanded, setExpanded] = useState(false)
  const [input, setInput] = useState('')
  const [parsed, setParsed] = useState<SignatureResult[] | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [mismatchWarnings, setMismatchWarnings] = useState<string[]>([])

  const parse = () => {
    setParseError(null)
    setMismatchWarnings([])
    setParsed(null)

    try {
      let sigs: SignatureResult[]
      const trimmed = input.trim()
      if (trimmed.startsWith('[')) {
        sigs = JSON.parse(trimmed)
      } else {
        const objects = trimmed
          .split(/\}\s*\{/)
          .map((s, i, arr) => {
            let obj = s
            if (i > 0) obj = '{' + obj
            if (i < arr.length - 1) obj = obj + '}'
            return obj
          })
        sigs = objects.map((s) => JSON.parse(s))
      }

      if (sigs.length === 0) {
        setParseError('No signatures found')
        return
      }

      for (let i = 0; i < sigs.length; i++) {
        const sig = sigs[i]
        if (!sig.signer || !sig.signature || !sig.payload) {
          setParseError(`Signature #${i + 1} is missing required fields (signer, signature, payload)`)
          return
        }
        if (!sig.signature.r || !sig.signature.s || sig.signature.v === undefined) {
          setParseError(`Signature #${i + 1} is missing r, s, or v`)
          return
        }
      }

      // Check payload consistency
      const ref = sigs[0].payload
      const warnings: string[] = []
      for (let i = 1; i < sigs.length; i++) {
        const p = sigs[i].payload
        if (p.type !== ref.type) warnings.push(`#${i + 1} has different action type`)
        if (p.multisigAddress !== ref.multisigAddress) warnings.push(`#${i + 1} has different multisigAddress`)
        if (p.network !== ref.network) warnings.push(`#${i + 1} has different network`)
        if (JSON.stringify(p.fields) !== JSON.stringify(ref.fields)) warnings.push(`#${i + 1} has different field values`)
      }

      setMismatchWarnings(warnings)
      setParsed(sigs)
    } catch {
      setParseError('Failed to parse JSON. Paste a JSON array of signature objects or individual objects.')
    }
  }

  const exportBundle = () => {
    if (!parsed || parsed.length === 0) return

    const ref = parsed[0].payload
    const innerAction: Record<string, unknown> = { type: ref.type }
    for (const [k, v] of Object.entries(ref.fields)) {
      innerAction[k] = v
    }

    const bundle: CoordinatorBundle = {
      signatures: parsed.map((s) => s.signature),
      inner_action: innerAction,
      multisig_user: ref.multisigAddress,
      network: ref.network,
    }

    const json = JSON.stringify(bundle, null, 2)
    const nonceVal = ref.fields.nonce ?? ref.fields.time ?? 'unknown'
    download(json, `multisig-bundle-${ref.type}-${nonceVal}.json`)
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-300 hover:text-gray-100"
      >
        <span>Coordinator: Collect & Bundle Signatures</span>
        <span className="text-gray-500">{expanded ? '[-]' : '[+]'}</span>
      </button>

      {expanded && (
        <div className="border-t border-gray-700 p-4 space-y-4">
          <p className="text-xs text-gray-400">
            Paste signature JSON blobs from all signers. The tool will validate that all payloads
            match and export a bundle for the Python submit flow.
          </p>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={'Paste signature JSON objects here...\n[\n  { "signer": "0x...", "signature": {...}, "payload": {...} },\n  { "signer": "0x...", "signature": {...}, "payload": {...} }\n]'}
            className="w-full h-40 rounded-md border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-xs text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-y"
          />

          <div className="flex gap-2">
            <button
              onClick={parse}
              disabled={!input.trim()}
              className="rounded-md border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Validate & Parse
            </button>
            {parsed && (
              <button
                onClick={exportBundle}
                disabled={mismatchWarnings.length > 0}
                className="rounded-md border border-blue-600 bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export Bundle (.json)
              </button>
            )}
          </div>

          {parseError && (
            <div className="rounded-md border border-red-800 bg-red-950/50 px-3 py-2 text-xs text-red-300">
              {parseError}
            </div>
          )}

          {mismatchWarnings.length > 0 && (
            <div className="rounded-md border border-red-800 bg-red-950/50 px-3 py-2 text-xs text-red-300">
              <div className="font-medium mb-1">Payload mismatch detected — signatures are incompatible:</div>
              <ul className="list-disc pl-4">
                {mismatchWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {parsed && mismatchWarnings.length === 0 && (
            <div className="rounded-md border border-green-800 bg-green-950/50 px-3 py-2 text-xs text-green-300">
              {parsed.length} signature(s) validated. All payloads match. Ready to export bundle.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
