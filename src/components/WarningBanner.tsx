export function WarningBanner() {
  return (
    <div className="rounded-lg border border-yellow-700 bg-yellow-950/50 px-4 py-3 text-sm text-yellow-200">
      <strong>Important:</strong> All signers must sign the exact same payload (same multisig
      address, agent address, agent name, nonce, and network). Coordinate nonce values before
      signing. Changing any field invalidates previously collected signatures.
    </div>
  )
}
