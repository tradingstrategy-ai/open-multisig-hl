import { useState } from 'react'
import type { SignatureResult } from '../lib/types'

interface Props {
  result: SignatureResult
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors"
    >
      {copied ? 'Copied!' : label}
    </button>
  )
}

function download(data: string, filename: string) {
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function SignatureOutput({ result }: Props) {
  const jsonStr = JSON.stringify(result, null, 2)
  const nonceVal = result.payload.fields.nonce ?? result.payload.fields.time ?? 'unknown'
  const filename = `sig-${result.signer.slice(0, 8)}-${result.payload.type}-${nonceVal}.json`

  return (
    <div className="space-y-4 rounded-lg border border-green-800 bg-green-950/20 p-4">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-green-400" />
        <div className="text-sm font-medium text-green-300">Signature Generated</div>
      </div>

      <div className="grid gap-3">
        <div>
          <div className="text-xs text-gray-400 mb-1">Signer</div>
          <div className="font-mono text-sm text-gray-200 break-all">{result.signer}</div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <div className="text-xs text-gray-400 mb-1">r</div>
            <div className="font-mono text-xs text-gray-300 break-all">{result.signature.r}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">s</div>
            <div className="font-mono text-xs text-gray-300 break-all">{result.signature.s}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">v</div>
            <div className="font-mono text-xs text-gray-300">{result.signature.v}</div>
          </div>
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-1">Full JSON (for coordinator)</div>
        <pre className="rounded-md border border-gray-700 bg-gray-900 p-3 text-xs font-mono text-gray-300 overflow-auto max-h-64">
          {jsonStr}
        </pre>
      </div>

      <div className="flex gap-2">
        <CopyButton text={jsonStr} label="Copy JSON" />
        <button
          onClick={() => download(jsonStr, filename)}
          className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors"
        >
          Download .json
        </button>
      </div>
    </div>
  )
}
