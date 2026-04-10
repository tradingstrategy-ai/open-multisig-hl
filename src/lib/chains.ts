/**
 * Chain metadata used for wallet_switchEthereumChain / wallet_addEthereumChain.
 *
 * Only chains we want users to switch *to* are listed here. Hyperliquid's L1
 * actions use chainId 1337 in their EIP-712 domain as a protocol marker, not a
 * real chain, so it is intentionally absent.
 */

export interface AddChainParams {
	chainId: `0x${string}`
	chainName: string
	nativeCurrency: { name: string; symbol: string; decimals: number }
	rpcUrls: string[]
	blockExplorerUrls: string[]
}

/**
 * Chain ID that Hyperliquid uses in its EIP-712 signing domain.
 *
 * Hyperliquid was built on the Arbitrum stack, so its off-chain signing
 * protocol hard-codes Arbitrum Sepolia (421614 / 0x66eee) as the EIP-712
 * `domain.chainId`. Signatures are produced off-chain and submitted to the
 * Hyperliquid API — the wallet does not actually need to send an Arbitrum
 * Sepolia transaction — but wallets like Rabby enforce that the connected
 * chain matches the EIP-712 domain and will reject signing with
 * `chainId should be same as current chainId` if it doesn't. Switching the
 * wallet to Arbitrum Sepolia (421614) satisfies that check.
 *
 * This constant is the "Hypercore signing chain" surfaced in the UI.
 */
export const HYPERCORE_SIGNING_CHAIN_ID = 421614

export const CHAINS: Record<number, AddChainParams> = {
	[HYPERCORE_SIGNING_CHAIN_ID]: {
		chainId: '0x66eee',
		chainName: 'Arbitrum Sepolia',
		nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
		rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
		blockExplorerUrls: ['https://sepolia.arbiscan.io'],
	},
}

export function getChainName(chainId: number): string {
	return CHAINS[chainId]?.chainName ?? `chain ${chainId}`
}

export function toHexChainId(chainId: number): `0x${string}` {
	return `0x${chainId.toString(16)}`
}
