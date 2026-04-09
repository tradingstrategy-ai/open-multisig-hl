import { useAccount, useConnect, useDisconnect } from 'wagmi'

export function ConnectWallet() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-800 bg-green-950/50 px-4 py-3">
        <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-400">Connected (outerSigner)</div>
          <div className="font-mono text-sm text-green-300 truncate">{address}</div>
        </div>
        <button
          onClick={() => disconnect()}
          className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded border border-gray-700 hover:border-gray-500"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-500 transition-colors"
        >
          Connect {connector.name}
        </button>
      ))}
    </div>
  )
}
