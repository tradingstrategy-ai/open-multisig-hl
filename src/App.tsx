import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectWallet } from './components/ConnectWallet'
import { WarningBanner } from './components/WarningBanner'
import { PayloadForm } from './components/PayloadForm'
import { EIP712Preview } from './components/EIP712Preview'
import { SignButton } from './components/SignButton'
import { SignatureOutput } from './components/SignatureOutput'
import { CoordinatorHelper } from './components/CoordinatorHelper'
import { useMultisigSign } from './hooks/useMultisigSign'
import { getActionDef } from './lib/eip712'
import { validateForm, isFormValid } from './lib/validation'
import type { FormValues } from './lib/types'

function App() {
  const { isConnected } = useAccount()
  const { sign, result, error, signing, reset } = useMultisigSign()

  const [values, setValues] = useState<FormValues>({
    actionType: 'approveAgent',
    multisigAddress: '',
    network: 'Mainnet',
    vaultAddress: '',
    fields: {
      agentAddress: '',
      agentName: '',
      nonce: '',
    },
  })

  const [errors, setErrors] = useState<Record<string, string | null>>({
    multisigAddress: null,
  })

  const actionDef = getActionDef(values.actionType)
  const formErrors = validateForm(values, actionDef)
  const canSign = isConnected && isFormValid(formErrors)

  const handleSign = () => {
    reset()
    sign(values)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">HL Multisig Signer</h1>
        <p className="text-sm text-gray-400 mt-1">
          Sign Hyperliquid multisig transactions with Rabby or MetaMask
        </p>
      </div>

      <WarningBanner />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: Form */}
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4 space-y-4">
            <h2 className="text-sm font-medium text-gray-300">1. Connect Wallet</h2>
            <ConnectWallet />
          </div>

          <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4 space-y-4">
            <h2 className="text-sm font-medium text-gray-300">2. Payload</h2>
            <PayloadForm
              values={values}
              onChange={setValues}
              errors={errors}
              onErrorsChange={setErrors}
            />
          </div>
        </div>

        {/* Right column: Preview */}
        <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
          <h2 className="text-sm font-medium text-gray-300 mb-3">EIP-712 Preview</h2>
          <EIP712Preview values={values} />
        </div>
      </div>

      {/* Sign button */}
      <div>
        <SignButton disabled={!canSign} signing={signing} onClick={handleSign} />
        {error && (
          <div className="mt-3 rounded-md border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* Signature output */}
      {result && <SignatureOutput result={result} />}

      {/* Coordinator helper */}
      <CoordinatorHelper />
    </div>
  )
}

export default App
