import { createConfig, http } from 'wagmi'
import { arbitrum } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

// We use Arbitrum as the chain for wagmi config.
// The actual signing uses EIP-712 domain with chainId 421614 (0x66eee),
// which is Hyperliquid's signatureChainId — not a real chain the wallet needs to be on.
// signTypedData works regardless of the wallet's current chain.
export const config = createConfig({
  chains: [arbitrum],
  connectors: [injected()],
  transports: {
    [arbitrum.id]: http(),
  },
})
