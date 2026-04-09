interface Props {
  disabled: boolean
  signing: boolean
  onClick: () => void
}

export function SignButton({ disabled, signing, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || signing}
      className={`w-full rounded-lg px-6 py-4 text-lg font-semibold transition-colors ${
        disabled || signing
          ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
          : 'bg-blue-600 text-white hover:bg-blue-500 border border-blue-500'
      }`}
    >
      {signing ? 'Waiting for wallet...' : 'Sign Payload'}
    </button>
  )
}
