/**
 * AppKit + wagmi setup for the multisig signer.
 *
 * Mirrors the approach in `tradingstrategy-ai/frontend` (src/lib/wallet/client.ts):
 * Reown AppKit on top of wagmi gives us a single connection modal that supports
 * browser-extension wallets (MetaMask, Rabby, etc.) AND WalletConnect-bridged
 * mobile wallets (Trust, Rainbow, MetaMask Mobile, Coinbase Wallet, …) via QR.
 *
 * Without WalletConnect, signers whose authorised wallet only exists on a mobile
 * device cannot sign — the previous EIP-6963-only flow was blind to anything
 * outside browser extensions.
 */

import { browser } from '$app/environment'
import {
	fallback,
	http,
	type Transport,
} from '@wagmi/core'
import { metaMask } from '@wagmi/connectors'
import { arbitrum, arbitrumSepolia } from '@reown/appkit/networks'
import { createAppKit } from '@reown/appkit'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { walletConnectConfig } from '$lib/config'

const { projectId } = walletConnectConfig

/**
 * Chains exposed in the AppKit modal.
 *
 * - `arbitrumSepolia` (421614) — Hyperliquid hardcodes this chainId in its
 *   EIP-712 signing domain, so wallets must be able to switch to it before
 *   signing. See `HYPERCORE_SIGNING_CHAIN_ID` in `src/lib/chains.ts`.
 * - `arbitrum` — kept available so signers can hold their assets on Arbitrum
 *   mainnet without surprise chain-switch prompts.
 *
 * Hyperliquid's own L1 (HyperCore) is not an EVM chain wallets can connect to,
 * so it is intentionally absent. HyperEVM is also omitted — this tool only
 * signs HyperCore actions, never sends EVM transactions.
 */
const chains = [arbitrumSepolia, arbitrum] as const
export type ConfiguredChain = (typeof chains)[number]
export type ConfiguredChainId = ConfiguredChain['id']

const transports: Record<number, Transport> = {}
chains.forEach(({ id }) => {
	transports[id] = fallback([http()])
})

const metadata = {
	name: 'Open Hyperliquid Multisigner',
	description: 'Sign Hyperliquid native multi-sig transactions',
	url: 'https://tradingstrategy-ai.github.io/open-multisig-hl/',
	icons: ['https://tradingstrategy.ai/brand-mark-100x100.png'],
}

const wagmiAdapter = new WagmiAdapter({
	projectId,
	transports,
	networks: [...chains],
	connectors: [metaMask({ dappMetadata: metadata })],
	ssr: !browser,
})

export const config = wagmiAdapter.wagmiConfig

export const modal = createAppKit({
	projectId,
	metadata,
	adapters: [wagmiAdapter],
	networks: [...chains],
	defaultNetwork: arbitrumSepolia,
	features: {
		analytics: true,
		email: false,
		socials: false,
	},
})
