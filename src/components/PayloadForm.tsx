import { validateField } from '../lib/validation'
import { getAllActions, getActionDef } from '../lib/eip712'
import type { ActionType, FormValues, Network } from '../lib/types'

interface Props {
  values: FormValues
  onChange: (values: FormValues) => void
  errors: Record<string, string | null>
  onErrorsChange: (errors: Record<string, string | null>) => void
}

function FieldLabel({ label, help }: { label: string; help?: string }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      {help && <div className="text-xs text-gray-600 mb-1">{help}</div>}
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  error,
  placeholder,
  mono = false,
  help,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string | null
  placeholder?: string
  mono?: boolean
  help?: string
}) {
  return (
    <div>
      <FieldLabel label={label} help={help} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-md border bg-gray-900 px-3 py-2 text-sm ${
          mono ? 'font-mono' : ''
        } ${
          error
            ? 'border-red-600 text-red-300 focus:border-red-500'
            : 'border-gray-700 text-gray-100 focus:border-blue-500'
        } focus:outline-none focus:ring-1 focus:ring-blue-500/50`}
      />
      {error && <div className="mt-1 text-xs text-red-400">{error}</div>}
    </div>
  )
}

function JsonField({
  label,
  value,
  onChange,
  error,
  placeholder,
  help,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string | null
  placeholder?: string
  help?: string
}) {
  return (
    <div>
      <FieldLabel label={label} help={help} />
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={6}
        className={`w-full rounded-md border bg-gray-900 px-3 py-2 font-mono text-xs ${
          error
            ? 'border-red-600 text-red-300 focus:border-red-500'
            : 'border-gray-700 text-gray-100 focus:border-blue-500'
        } focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-y`}
      />
      {error && <div className="mt-1 text-xs text-red-400">{error}</div>}
    </div>
  )
}

function BoolField({
  label,
  value,
  onChange,
  help,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  help?: string
}) {
  return (
    <div>
      <FieldLabel label={label} help={help} />
      <div className="flex gap-2">
        {['true', 'false'].map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              value === opt
                ? 'border-blue-600 bg-blue-950 text-blue-300'
                : 'border-gray-700 bg-gray-900 text-gray-500 hover:border-gray-600'
            }`}
          >
            {opt === 'true' ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    </div>
  )
}

function NonceField({
  label,
  value,
  onChange,
  error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string | null
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Timestamp in ms"
          className={`flex-1 rounded-md border bg-gray-900 px-3 py-2 font-mono text-sm ${
            error
              ? 'border-red-600 text-red-300'
              : 'border-gray-700 text-gray-100 focus:border-blue-500'
          } focus:outline-none focus:ring-1 focus:ring-blue-500/50`}
        />
        <button
          onClick={() => onChange(Date.now().toString())}
          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-gray-100 whitespace-nowrap"
        >
          Now (ms)
        </button>
      </div>
      {error && <div className="mt-1 text-xs text-red-400">{error}</div>}
    </div>
  )
}

export function PayloadForm({ values, onChange, errors, onErrorsChange }: Props) {
  const allActions = getAllActions()
  const actionDef = getActionDef(values.actionType)

  const updateActionType = (type: ActionType) => {
    const newDef = getActionDef(type)
    const newFields: Record<string, string> = {}
    for (const f of newDef.fields) {
      newFields[f.name] = f.eip712Type === 'bool' ? 'false' : ''
    }
    onChange({
      ...values,
      actionType: type,
      fields: newFields,
    })
    onErrorsChange({ multisigAddress: errors.multisigAddress })
  }

  const updateField = (fieldName: string, value: string) => {
    const newFields = { ...values.fields, [fieldName]: value }
    onChange({ ...values, fields: newFields })

    const fieldDef = actionDef.fields.find((f) => f.name === fieldName)
    if (fieldDef) {
      const error = value ? validateField(value, fieldDef.eip712Type, fieldDef.required) : null
      onErrorsChange({ ...errors, [fieldName]: error })
    }
  }

  const updateMultisig = (value: string) => {
    onChange({ ...values, multisigAddress: value })
    onErrorsChange({
      ...errors,
      multisigAddress: value ? validateField(value, 'address', true) : null,
    })
  }

  // Group actions by signing mode for the dropdown
  const userSignedActions = allActions.filter((a) => a.signingMode === 'user-signed')
  const l1Actions = allActions.filter((a) => a.signingMode === 'l1')

  return (
    <div className="space-y-4">
      {/* Action type dropdown */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Action Type</label>
        <select
          value={values.actionType}
          onChange={(e) => updateActionType(e.target.value as ActionType)}
          className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <optgroup label="User-Signed Actions (EIP-712)">
            {userSignedActions.map((a) => (
              <option key={a.type} value={a.type}>{a.label}</option>
            ))}
          </optgroup>
          <optgroup label="L1 Actions (Phantom Agent)">
            {l1Actions.map((a) => (
              <option key={a.type} value={a.type}>{a.label}</option>
            ))}
          </optgroup>
        </select>
        <div className="mt-1 flex items-center gap-2">
          <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
            actionDef.signingMode === 'user-signed'
              ? 'bg-blue-950 text-blue-300 border border-blue-800'
              : 'bg-purple-950 text-purple-300 border border-purple-800'
          }`}>
            {actionDef.signingMode === 'user-signed' ? 'EIP-712' : 'L1 Phantom Agent'}
          </span>
          <span className="text-xs text-gray-500">{actionDef.description}</span>
        </div>
      </div>

      {/* Multisig address — common to all actions */}
      <InputField
        label="Multisig Address (payloadMultiSigUser)"
        value={values.multisigAddress}
        onChange={updateMultisig}
        error={errors.multisigAddress}
        placeholder="0x..."
        mono
      />

      {/* Action-specific fields */}
      {actionDef.fields.map((field) => {
        if (field.eip712Type === 'bool') {
          return (
            <BoolField
              key={field.name}
              label={field.label}
              value={values.fields[field.name] ?? 'false'}
              onChange={(v) => updateField(field.name, v)}
              help={field.help}
            />
          )
        }
        if (field.eip712Type === 'uint64') {
          return (
            <NonceField
              key={field.name}
              label={field.label}
              value={values.fields[field.name] ?? ''}
              onChange={(v) => updateField(field.name, v)}
              error={errors[field.name]}
            />
          )
        }
        if (field.eip712Type === 'json') {
          return (
            <JsonField
              key={field.name}
              label={field.label}
              value={values.fields[field.name] ?? ''}
              onChange={(v) => updateField(field.name, v)}
              error={errors[field.name]}
              placeholder={field.placeholder}
              help={field.help}
            />
          )
        }
        return (
          <InputField
            key={field.name}
            label={field.label}
            value={values.fields[field.name] ?? ''}
            onChange={(v) => updateField(field.name, v)}
            error={errors[field.name]}
            placeholder={field.placeholder}
            mono={field.mono}
            help={field.help}
          />
        )
      })}

      {/* Network toggle */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Network</label>
        <div className="flex gap-2">
          {(['Mainnet', 'Testnet'] as Network[]).map((net) => (
            <button
              key={net}
              onClick={() => onChange({ ...values, network: net })}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                values.network === net
                  ? net === 'Mainnet'
                    ? 'border-green-600 bg-green-950 text-green-300'
                    : 'border-yellow-600 bg-yellow-950 text-yellow-300'
                  : 'border-gray-700 bg-gray-900 text-gray-500 hover:border-gray-600'
              }`}
            >
              {net}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
